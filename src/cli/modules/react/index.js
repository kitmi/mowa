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

exports.moduleDesc = 'Provide commands to enable react in an app.';

exports.commandsDesc = {
    'init': "Initialize the react environment",
    'newPage': "Create a new react app and a corresponding page component",
    'install': "Install react component"
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'init':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            break;

        case 'install':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['package'] = {
                desc: 'The name of the react component package to install',
                alias: [ 'pkg' ],
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve([ 'react-router-dom', 'material-ui@next', 'material-ui-icons' ])
            };
            break;

        case 'newPage':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['page'] = {
                desc: 'The name of the page to create',
                required: true,
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
    api.log('verbose', 'exec => mowa react init');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    api.log('info', 'Initializing react development environment.');

    //make sure client folder exist
    let utilsPath = path.join(appModule.frontendPath, 'utils');
    fs.ensureDirSync(utilsPath);

    let mowaUtilSource = path.join(__dirname, 'template', 'client', 'utils', 'mowa.js');
    let mowaUtilDest = path.join(utilsPath, 'mowa.js');

    fs.copySync(mowaUtilSource, mowaUtilDest);

    let appPath = appModule.absolutePath;

    shell.cd(appPath);
    let stdout = Util.runCmdSync('npm i --save-dev react react-dom prop-types');
    shell.cd(api.base);

    api.log('verbose', stdout);
    api.log('info', 'Enabled react.');
};

exports.install = function (api) {
    api.log('verbose', 'exec => mowa react install');

    let appName = api.getOption('app');
    let pkgName = api.getOption('pkg');
    assert: {
        appName, Util.Message.DBC_VAR_NOT_NULL;
        pkgName, Util.Message.DBC_VAR_NOT_NULL;
    }

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    let appPath = appModule.absolutePath;

    shell.cd(appPath);
    let stdout = Util.runCmdSync(`npm i --save-dev ${pkgName}`);
    shell.cd(api.base);

    api.log('verbose', stdout);
    api.log('info', 'Enabled react.');
};

exports.newPage = function (api) {
    api.log('verbose', 'exec => mowa react newPage');

    let appName = api.getOption('app');
    let page = api.getOption('page');
    assert: {
        appName, Util.Message.DBC_VAR_NOT_NULL;
        page, Util.Message.DBC_VAR_NOT_NULL;
    }

    page = Util.S(page).camelize().s;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    const swig  = require('swig-templates');
    let viewPageSource = path.resolve(__dirname, 'template', 'server', 'react.swig');
    let viewPageDest = path.join(appModule.backendPath, Mowa.Literal.VIEWS_PATH, 'react.swig');

    if (fs.existsSync(viewPageDest)) {
        api.log('info', 'React page template already exists.');
    } else {
        fs.copySync(viewPageSource, viewPageDest);
        api.log('info', 'Created react page template.');
    }

    let targetPage = path.join(appModule.frontendPath, `${page}.js`);
    if (fs.existsSync(targetPage)) {
        api.log('info', `React page "${page}.js" already exists.`);
    } else {
        let locals = {
            page,
            pageComponent: Util.S(page).capitalize().s
        };

        let pageJsTemplate = path.resolve(__dirname, 'template', 'client', 'page.js.swig');
        let pageJs= swig.renderFile(pageJsTemplate, locals);

        fs.writeFileSync(targetPage, pageJs);

        let pageComTemplate = path.resolve(__dirname, 'template', 'client', 'pageComponent.js.swig');
        let pageCom = swig.renderFile(pageComTemplate, locals);

        fs.ensureDirSync(path.join(appModule.frontendPath, 'pages'));
        fs.writeFileSync(path.join(appModule.frontendPath, 'pages', `${locals.pageComponent}.js`), pageCom);
        api.log('info', `Created a new react page "${page}"`);
    }
};