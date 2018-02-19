"use strict";

const path = require('path');
const Util = require('../../../util.js');
const fs = Util.fs;
const Promise = Util.Promise;

/**
 * @module MowaCLI_Default
 * @summary Default module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to initiate a new project or create a new app.';

exports.commandsDesc = {
    'init': 'Run this command in a empty folder to initiate a new mowa project.'    
};

exports.help = function (api) {
    let cmdOptions = {};
    
    switch (api.command) {        
        case 'init':
            cmdOptions['skip-npm-install'] = {
                desc: 'Skip running npm install after initialization',
                bool: true,
                alias: [ 'skip' ],
                default: false,
                inquire: true
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
    api.log('info', `Generated server configuration.`);

    //copy server folder from template
    const serverDest = path.resolve(api.base, 'server');
    const serverSource = path.join(templateFolder, 'server');
    fs.copySync(serverSource, serverDest);
    api.log('info', `Generated the default application.`);
    
    //generate a package.json if not exist
    const packageJson = path.resolve(api.base, 'package.json');
    let npmInit = fs.existsSync(packageJson) ?
        Promise.resolve() :
        new Promise((resolve, reject) => {
            Util.runCmd('npm init -y', (error, output) => {
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
        let serverJsContent = Util.S(serverJsTemplateContent).template({serverName: pkg.name}).s;
        fs.writeFileSync(serverJsDst, serverJsContent, 'utf8');

        pkg.dependencies || (pkg.dependencies = {});
        pkg.dependencies['mowa'] = '*';
        fs.writeJsonSync(packageJson, pkg, { spaces: 4, encoding: 'utf8' });

        if (skipNpmInstall) {
            return resolve();
        }

        Util.runCmd('npm install', (error, output) => {
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