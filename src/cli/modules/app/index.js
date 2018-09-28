"use strict";

const path = require('path');
const shell = require('shelljs');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;

const Mowa = require('../../../server.js');
const MowaHelper = require('../../mowa-helper.js');

/**
 * @module MowaCLI_App
 * @summary Application module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to config a app.';

exports.commandsDesc = {
    'list': "List all apps in the project",
    'create': 'Create a new app in the project',
    'install': 'Install npm module for an app and save as dependency',
    'bootstrap': 'Add a bootstrap file for an app',
    'remove': "Remove an app from the project",
    'pack': "Pack the app into a distributable archive"
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
                inquire: true,
                default: false,
                bool: true
            };
            break;

        case 'install':
            api.makeAppChoice(cmdOptions);

            cmdOptions['package'] = {
                desc: 'The name of the npm package to install',
                promptMessage: 'Please enter the package to install:',                
                alias: [ 'pkg' ],
                required: true,
                inquire: true
            };
            cmdOptions['dev'] = {
                desc: 'Install for development mode or not',
                promptMessage: 'Install the package as devDependency',            
                promptDefault: false,    
                default: false,
                bool: true,
                inquire: true
            };
            break;

        case 'bootstrap':
            api.makeAppChoice(cmdOptions);

            cmdOptions['name'] = {
                desc: 'The name of the bootstrap file',
                required: true,
                inquire: true
            };
            break;

        case 'remove':
            api.makeAppChoice(cmdOptions);

            cmdOptions['y'] = {
                desc: 'Skip removal confirmation',
                default: false,
                bool: true
            };
            break;

        case 'pack':
            api.makeAppChoice(cmdOptions);
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
    let moduleNames = MowaHelper.getAvailableAppNames(api);

    //read router config
    let activatedApps = {};

    _.forOwn(api.server.config.routing, (config, route) => {
        if (config.mod) {
            activatedApps[route] = config.mod.name;
        }
    });

    api.log('info', 'All apps in the project:\n  '
        + moduleNames.join('\n  ')
        + '\n\nActivated apps:'
        + _.reduce(activatedApps, (sum, value, key) => (sum + '  ' + key + ' -> ' + value + '\n'), '')
    );
};

exports.create = function (api) {
    api.log('verbose', 'exec => mowa createApp');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let mountingPoint = api.getOption('mountAt') || appName;
    mountingPoint = Util.ensureLeftSlash(mountingPoint);

    //check name availability
    const appDest = path.join(api.base, Mowa.Literal.APP_MODULES_PATH, appName);

    if (fs.existsSync(appDest)) {
        return Promise.reject('App "' + appName + '" already exist!');
    }

    //create folder
    fs.ensureDirSync(appDest);

    //copy app_directory
    const templatePath = api.getTemplatePath('app');
    const templateFolder = path.join(templatePath, 'newApp');
    fs.copySync(templateFolder, appDest);
    api.log('info', 'Generated app files.');

    //add routing for the new module.
    if (api.server.config.routing && api.server.config.routing[mountingPoint]) {
        if (!api.getOption('override')) {
            return Promise.reject(`Route "${mountingPoint}" is already in use.`);
        }
    }

    let routing = Object.assign({}, api.server.config.routing, { [mountingPoint]: {
        app: {
            name: appName
        }
    }});

    return MowaHelper.writeConfigBlock_(api.server.configLoader, 'routing', routing).then(() => {
        api.log('info', 'Mounted the app at: ' + mountingPoint);

        const packageJson = path.resolve(api.base, 'package.json');
        const pkg = require(packageJson);

        const interpolates = { project: pkg.name, name: appName };

        const startSource = path.join(templatePath, 'standalone.template.js');
        const startDest = path.join(appDest, 'standalone.js');
        let startContent = fs.readFileSync(startSource, 'utf8');
        startContent = Util.template(startContent, interpolates);
        fs.writeFileSync(startDest, startContent, 'utf8');
        api.log('info', 'Generated standalone.js for smoke test.');

        const indexSource = path.join(templatePath, 'index.template.js');
        const indexDest = path.join(appDest, 'index.js');
        fs.copySync(indexSource, indexDest);
        api.log('info', 'Generated index.js.');

        const packageSource = path.join(templatePath, 'package.template.json');
        const packageDest = path.join(appDest, 'package.json');
        let pkgContent = fs.readFileSync(packageSource, 'utf8');
        pkgContent = Util.template(pkgContent, interpolates);
        fs.writeFileSync(packageDest, pkgContent, 'utf8');
        api.log('info', 'Generated package.json for npm init.');

        shell.cd(appDest);
        let stdout = Util.runCmdSync('npm init -y');
        shell.cd(api.base);

        api.log('verbose', stdout.toString());

        api.log('info', 'Enabled npm.');
    });
};

exports.install = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa app install');

    let appModule = MowaHelper.getAppModuleToOperate(api);
    let packageName = api.getOption('package');

    if (!packageName) {
        return Promise.reject('Npm package name is required!');
    }

    let saveMode = api.getOption('dev') ? '--save-dev' : '--save';

    shell.cd(appModule.absolutePath);
    let stdout = Util.runCmdSync(`npm install ${packageName} ${saveMode}`);
    shell.cd(api.base);

    api.log('info', stdout.toString());

    api.log('info', `Installed a npm package "${packageName}" for app "${appModule.name}".`);
};

exports.bootstrap = function (api) {
    api.log('verbose', 'exec => mowa app bootstrap');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    const modFolder = path.join(api.base, Mowa.Literal.APP_MODULES_PATH, appName);
    if (!fs.existsSync(modFolder)) {
        return Promise.reject('App "' + appName + '" not exist!');
    }

    const templatePath = api.getTemplatePath('app');

    let bootstrapFileName = api.getOption('name');
    return (bootstrapFileName ? Promise.resolve(bootstrapFileName) : inputName()).then(bn => {
        
        const bootstrapSource = path.join(templatePath, 'bootstrap.template.js');
        const bootstrapDir = path.join(modFolder, Mowa.Literal.SERVER_CFG_NAME, 'bootstrap');

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

exports.remove = function (api) {
    api.log('verbose', 'exec => mowa app remove');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    //check the app folder
    const modFolder = path.join(api.base, Mowa.Literal.APP_MODULES_PATH, appName);
    if (!fs.existsSync(modFolder)) {
        return Promise.reject('App "' + appName + '" not exist!');
    }

    let skipConfirmaton = api.getOption('y');
    return (skipConfirmaton ? Promise.resolve(true) : require('inquirer').prompt([
        { type: 'confirm', name: 'continueRemove', message: 'Confirm to proceed: ', default: false }
    ]).then(function (answers) {
        if (answers.continueRemove) {
            return true;
        }

        api.log('info', 'User aborted.');
        return false;
    })).then(confirmation => {
        if (!confirmation) {
            return Promise.resolve();
        }

        shell.rm('-rf', modFolder);

        api.log('info', 'Removed: ' + modFolder);

        let needRewrite = false;

        let routing = Object.assign({}, api.server.configLoader.data.routing);

        _.forOwn(api.server.configLoader.data.routing, (config, route) => {
            if (config.app && config.app.name === appName) {
                delete routing[route];
                needRewrite = true;
            }
        });

        if (needRewrite) {
            return MowaHelper.writeConfigBlock_(api.server.configLoader, 'routing', routing).then(() => {
                api.log('info', `Removed app [${appName}] from routing.`);
            });
        }
    });
};

exports.pack = function (api) {
    api.log('verbose', 'exec => mowa app pack');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    api.log('info', `Start packing app [${appName}] ...`);

    const archiver = require('archiver');

    let releasePath = appModule.toAbsolutePath('release');
    fs.ensureDirSync(releasePath);
    let targetZip = path.join(releasePath, `app-bundle.zip`);

    return new Promise((resolve, reject) => {
        // create a file to stream archive data to.
        let output = fs.createWriteStream(targetZip);
        let archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        output.on('close', function() {
            api.log('info', `The app [${appName}] is packed to "${targetZip}". Total: ${archive.pointer()} bytes`);

            resolve();
        });

        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function(err) {
            if (err.code === 'ENOENT') {
                // log warning
                api.log('warn', err.message);
            } else {
                // throw error
                throw err;
            }
        });

        // good practice to catch this error explicitly
        archive.on('error', function(err) {
            throw err;
        });

        // pipe archive data to the file
        archive.pipe(output);

        MowaHelper.packFiles(api, archive, appModule.absolutePath);

        // finalize the archive (ie we are done appending files but streams have to finish yet)
        // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
        archive.finalize();
    });
};