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
    'create': 'Create a new app in the project',
    'install': 'Install npm module for an app',
    'bootstrap': 'Add a bootstrap file for an app',
    'remove': "Remove an app from the project"
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'create':
            cmdOptions['app'] = {
                desc: 'The name of the app to create',
                required: true,
                inquire: true
            };
            cmdOptions['mountAt'] = {
                desc: 'The route of the app (i.e. the path in URL)',
                alias: [ 'route' ]
            };
            cmdOptions['overrideExistingRoute'] = {
                desc: 'Whether to override existing route if any',
                alias: [ 'override' ],
                default: false,
                bool: true
            };
            break;
        case 'install':
            cmdOptions['app'] = {
                desc: 'The name of the app to be removed',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAppNames(api))
            };
            cmdOptions['nm'] = {
                desc: 'Specify the name of the npm module',
                alias: [ 'module', 'npm-module' ],
                required: true,
                inquire: true
            };
            break;

        case 'bootstrap':
            cmdOptions['app'] = {
                desc: 'The name of the app to be removed',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAppNames(api))
            };
            cmdOptions['name'] = {
                desc: 'Specify the name of the bootstrap file'
            };
            break;

        case 'remove':
            cmdOptions['app'] = {
                desc: 'The name of the app to be removed',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAppNames(api))
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
    let moduleNames = MowaHelper.getAppNames(api);

    //read router config
    return MowaHelper.loadServerConfig_(api).then(loader => {
        let activatedApps = {};

        _.forOwn(loader.data.routing, (config, route) => {
            if (config.mod) {
                activatedApps[route] = config.mod.name;
            }
        });

        api.log('info', 'All apps in the project:\n  '
            + moduleNames.join('\n  ')
            + '\n\nActivated apps:'
            + _.reduce(activatedApps, (sum, value, key) => (sum + '  ' + key + ' -> ' + value + '\n'), '')
        );
    });
};

exports.create = function (api) {
    api.log('verbose', 'exec => mowa createApp');

    let appName = api.getOption('app');
    if (!appName) {
        return Promise.reject('App name is required!');
    }

    let mountingPoint = api.getOption('mountAt') || appName;

    mountingPoint = Util.ensureLeftSlash(mountingPoint);

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
    api.log('info', 'Generated app files.');

    //add routing for the new module.
    return MowaHelper.loadServerConfig_(api).then(loader => {

        if (loader.data.routing && loader.data.routing[mountingPoint]) {
            if (!api.getOption('override')) {
                return Promise.reject(`Route "${mountingPoint}" is already in use.`);
            }
        }

        let routing = Object.assign({}, loader.data.routing, { [mountingPoint]: {
            mod: {
                name: appName
            }
        }});

        return MowaHelper.writeConfigBlock_(loader, 'routing', routing);
    }).then(() => {
        api.log('info', 'Mounted the app at: ' + mountingPoint);

        const packageSource = path.join(__dirname, 'template', 'package.template.json');
        const packageDest = path.join(appDest, 'package.json');
        let pkgContent = fs.readFileSync(packageSource, 'utf8');
        pkgContent = Util.S(pkgContent).template({ name: appName }).s;
        fs.writeFileSync(packageDest, pkgContent, 'utf8');

        const indexSource = path.join(__dirname, 'template', 'standalone.template.js');
        const indexDest = path.join(appDest, 'standalone.js');
        let indexContent = fs.readFileSync(indexSource, 'utf8');
        indexContent = Util.S(indexContent).template({ name: appName }).s;
        fs.writeFileSync(indexDest, indexContent, 'utf8');

        shell.cd(appDest);
        let stdout = Util.runCmdSync('npm init -y');
        shell.cd(api.base);

        api.log('verbose', stdout.toString());

        api.log('info', 'Enabled npm.');
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
};

function removeAppByName(api, name) {
    const modFolder = path.join(api.base, Util.Literal.APP_MODULES_PATH, name);
    shell.rm('-rf', modFolder);

    api.log('info', 'Removed: ' + modFolder);

    let needRewrite = false;

    //read router config
    return MowaHelper.loadServerConfig_(api).then(loader => {

        let routing = Object.assign({}, loader.data.routing);        

        _.forOwn(loader.data.routing, (config, route) => {
            if (config.mod && config.mod.name === name) {
                delete routing[route];
                needRewrite = true;
            }
        });
        
        if (needRewrite) {
            return MowaHelper.writeConfigBlock_(loader, 'routing', routing);    
        }        
    }).then(() => {
        if (needRewrite) {
            api.log('info', `Removed app [${name}] from routing.`);
        }        
    });
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

            api.log('info', 'User aborted.');
            return Promise.resolve();
        });
    }

    return removeAppByName(api, appName);
};