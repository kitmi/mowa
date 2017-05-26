"use strict";

const path = require('path');
const fs = require('graceful-fs-extra');
const shell = require('shelljs');
const Util = require('../../../util.js');

exports.desc = {
    'desc': 'Provide commands to initiate a new project or create a new app.',
    'init': 'Run this command in a empty folder to initiate a new mowa project.',
    'createApp': 'Run this command to create a new app in a mowa project.'
};

exports.help = function (api) {
    let cmdOptions = {};
    
    switch (api.command) {        
        case 'init':
            cmdOptions['skip-npm-install'] = {
                desc: 'Skip running npm install after initialization',
                bool: true,
                default: false
            };
            break;
        
        case 'createApp':
            cmdOptions['n'] = {
                desc: 'Specify the name of the app to be created',
                alias: [ 'name' ]
            };
            break;

        case 'help':
        default:
            //module general options
            break;
    }
    
    return cmdOptions;
};

exports.init = function (api) {
    api.log('verbose', 'exec => mowa init');

    let skipNpmInstall = api.getOption('skip-npm-install') || false;
    const etcDest = path.join(api.base, 'etc');

    //check whether etc folder exist
    if (fs.existsSync(etcDest)) {
        return Promise.reject('Project already exist.');
    }

    //create etc folder
    fs.ensureDirSync(etcDest);

    //copy etc folder from template
    const templateFolder = path.resolve(__dirname, 'template');
    const etcSource = path.join(templateFolder, 'etc');
    fs.copySync(etcSource, etcDest);
    api.log('info', `copied "${etcSource}" to "${etcDest}".`);

    //copy server folder from template
    const serverDest = path.resolve(api.base, 'server');
    const serverSource = path.join(templateFolder, 'server');
    fs.copySync(serverSource, serverDest);
    api.log('info', `copied "${serverSource}" to "${serverDest}".`);
    
    //generate a package.json if not exist
    const packageJson = path.resolve(api.base, 'package.json');
    let npmInit = fs.existsSync(packageJson) ?
        Promise.resolve() :
        new Promise((resolve, reject) => {
            U.Util.runCmd('npm init -y', (error, output) => {
                if (output.stdout) {
                    api.log('verbose', output.stdout);
                }

                if (output.stderr) {
                    api.log('error', output.stderr);
                }

                if (error) return reject(error);

                api.log('info', 'Created a package.json file under ' + api.base);

                resolve();
            });
        });

    return npmInit.then(() => new Promise((resolve, reject) => {
        //generate server entry file
        const serverJsTemplate = path.join(templateFolder, 'server.template.js');
        const serverJsDst = path.join(api.base, 'server.js');
        const pkg = require(packageJson);
        let serverJsTemplateContent = fs.readFileSync(serverJsTemplate, 'utf8');
        let serverJsContent = U.Util.S(serverJsTemplateContent).template({serverName: pkg.name}).s;
        fs.writeFileSync(serverJsDst, serverJsContent, 'utf8');

        pkg.dependencies || (pkg.dependencies = {});
        pkg.dependencies['mowa'] = '*';
        fs.writeJsonSync(packageJson, pkg, 'utf8');

        if (skipNpmInstall) {
            return resolve();
        }

        U.Util.runCmd('npm install', (error, output) => {
            if (output.stdout) {
                api.log('verbose', output.stdout);
            }

            if (output.stderr) {
                api.log('error', output.stderr);
            }

            if (error) return reject(error);

            api.log('info', 'Installed mowa as dependency.');

            resolve();
        });
    }));
};

function createAppByName(api, appName) {
    //check name availability
    const appDest = path.join(api.base, Util.Literal.APP_MODULES_PATH, appName);

    if (fs.existsSync(appDest)) {
        return Promise.reject('App "' + appName + '" already exist!');
    }

    //create folder
    fs.ensureDirSync(appDest);

    //copy app_directory
    const templateFolder = path.resolve(__dirname, 'template', 'app');
    fs.copySync(templateFolder, appDest);

    //add routing for the new module.
    const routingFile = path.join(api.base, 'etc', 'routing.default.js');
    if (!fs.existsSync(routingFile)) {
        return Promise.reject('"routing.js" not exist. Try run "mowa init" first');
    }

    const routingConfig = require(routingFile);

    const appRoute = '/' + appName;
    if(appRoute in routingConfig){
        //error handling.
        return Promise.reject(appRoute + ' Already Exist');

    } else {
        routingConfig[appRoute] = {
            mod: {
                name: appName
            }
        };
        //write updated config into routing.js
        const moduleExpert = 'module.exports = ';
        const routingData = moduleExpert + JSON.stringify(routingConfig, null, 4) + ';';
        fs.writeFileSync(routingFile, routingData);
    }

    shell.cd(appDest);
    let stdout = U.Util.runCmdSync('npm init -y');
    shell.cd(api.base);

    api.log('verbose', stdout.toString());

    api.log('info', 'Created package.json file for app [' + appName + '].');

    return Promise.resolve();
}

exports.createApp = function (api) {
    api.log('verbose', 'exec => mowa createApp');

    let appName = api.getOption('name');

    if (appName) {
        return createAppByName(api, appName);
    }

    //ask for app name
    const inquirer = require('inquirer');
    return inquirer.prompt([
        { type: 'input', name: 'appName', message: 'App Name: ' }
    ]).then(function (answers) {
        let appName = answers.appName.trim();
        if (!appName) {
            return Promise.reject('App name is required!');
        }

        return createAppByName(api, appName);
    });
};

