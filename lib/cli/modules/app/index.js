"use strict";

const path = require('path');
const shell = require('shelljs');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;

const MowaHelper = require('../../mowa-helper.js');

/**
 * @module MowaCLI_App
 * @summary Application module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to config a app.';

exports.commandsDesc = {
    'list': "List all apps in the project",
    'install': 'Install npm module for an app',
    'bootstrap': 'Add a bootstrap file for an app',
    'remove': "Remove an app from the project"
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'install':
            cmdOptions['app'] = {
                desc: 'Specify the name of the app'
            };
            cmdOptions['nm'] = {
                desc: 'Specify the name of the npm module',
                alias: [ 'module', 'npm-module' ]
            };
            break;

        case 'bootstrap':
            cmdOptions['app'] = {
                desc: 'Specify the name of the app'
            };
            cmdOptions['name'] = {
                desc: 'Specify the name of the bootstrap file'
            };
            break;

        case 'remove':
            cmdOptions['app'] = {
                desc: 'Specify the name of the app to be removed'
            };
            cmdOptions['y'] = {
                desc: 'Skip removal confirmation',
                default: false,
                bool: true
            };
            break;

        case 'help':
        default:
            //module general options
            break;
    }

    return cmdOptions;
};

exports.list = function (api) {
    api.log('verbose', 'exec => mowa app list');

    //get a list of apps
    let moduleNames = api.getAppNames();

    //read router config
    return MowaHelper.startMowa(api).then(server => {
        let activatedApps = {};

        _.forOwn(server.config.routing, (config, route) => {
            if (config.mod) {
                activatedApps[route] = config.mod.name;
            }
        });

        console.log('All apps in the project:');
        console.log('  ' + moduleNames.join('\n  ') + '\n');

        console.log('Activated apps:');
        console.log(_.reduce(activatedApps, (sum, value, key) => (sum + key + ' -> ' + value + '\n'), '  '));

        return Promise.resolve();
    });
};

exports.install = function (api) {
    api.log('verbose', 'exec => mowa app install');

    let appName = api.getOption('app');

    if (!appName) {
        return Promise.reject('App name is required!');
    }

    const modFolder = path.join(api.base, Util.Literal.APP_MODULES_PATH, appName);
    if (!fs.existsSync(modFolder)) {
        return Promise.reject('App "' + appName + '" not exist!');
    }

    let moduleName = api.getOption('nm');
    if (!moduleName) {
        return Promise.reject('Npm module name is required!');
    }

    shell.cd(modFolder);
    let stdout = Util.runCmdSync(`npm install ${moduleName} --save`);
    shell.cd(api.base);

    api.log('verbose', stdout.toString());

    api.log('info', `Installed a npm module "${moduleName}" for app "${appName}".`);

    return Promise.resolve();
};

function inputName() {
    const inquirer = require('inquirer');
    return inquirer.prompt([
        { type: 'input', name: 'bootstrapName', message: 'Bootstrap File Name: ' }
    ]).then(answers => {
        let bootstrapName = answers.bootstrapName.trim();
        if (!bootstrapName) {
            return Promise.reject('Bootstrap file name is required!');
        }

        return Promise.resolve(bootstrapName);
    });
}

exports.bootstrap = function (api) {
    api.log('verbose', 'exec => mowa app install');

    let appName = api.getOption('app');

    if (!appName) {
        return Promise.reject('App name is required!');
    }

    const modFolder = path.join(api.base, Util.Literal.APP_MODULES_PATH, appName);
    if (!fs.existsSync(modFolder)) {
        return Promise.reject('App "' + appName + '" not exist!');
    }

    let bootstrapFileName = api.getOption('name');
    return (bootstrapFileName ? Promise.resolve(bootstrapFileName) : inputName()).then(bn => {
        const templateFolder = path.resolve(__dirname, 'template');
        const bootstrapSource = path.join(templateFolder, 'bootstrap.template.js');
        const bootstrapDir = path.join(modFolder, Util.Literal.SERVER_CFG_NAME, 'bootstrap');

        fs.ensureDirSync(bootstrapDir);

        const bootstrapDesc = path.join(bootstrapDir, bootstrapFileName + '.js');
        if (fs.existsSync(bootstrapDesc)) {
            return Promise.reject('Bootstrap file "' + bootstrapFileName + '" already exist!');
        }

        fs.copySync(bootstrapSource, bootstrapDesc);

        api.log('info', `Created a bootstrap file "${bootstrapFileName}" for app "${appName}".`);

        return Promise.resolve();
    });
}

function removeAppByName(api, name) {
    const modFolder = path.join(api.base, Util.Literal.APP_MODULES_PATH, name);
    shell.rm('-rf', modFolder);

    console.log('Removed ' + modFolder);

    //read router config
    const routerJs = path.join(api.base, 'etc', 'routing.js');
    const routing = require(routerJs);

    let routesToRemove = [];

    _.forOwn(routing, (config, route) => {
        if (config.mod && config.mod.name === name) {
            routesToRemove.push(route);
        }
    });

    _.each(routesToRemove, r => delete routing[r]);

    //write updated config into routing.js
    const moduleExpert = 'module.exports = ';
    const routingData = moduleExpert + JSON.stringify(routing, null, 4) + ';';
    fs.writeFileSync(routerJs, routingData);

    return Promise.resolve();
}

exports.remove = function (api) {
    api.log('verbose', 'exec => mowa app remove');

    let appName = api.getOption('app');

    if (!appName) {
        return Promise.reject('App name is required!');
    }

    //check the app folder
    const modFolder = path.join(api.base, Util.Literal.APP_MODULES_PATH, appName);
    if (!fs.existsSync(modFolder)) {
        return Promise.reject('App "' + appName + '" not exist!');
    }

    let skipConfirmaton = api.getOption('y');
    if (!skipConfirmaton) {
        //ask for app name
        const inquirer = require('inquirer');
        return inquirer.prompt([
            { type: 'confirm', name: 'continueRemove', message: 'Confirm to proceed: ', default: false }
        ]).then(function (answers) {
            if (answers.continueRemove) {
                return removeAppByName(api, appName);
            }

            console.log('User aborted.');
            return Promise.resolve();
        });
    }

    return removeAppByName(api, appName);
};