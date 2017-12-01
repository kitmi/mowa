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

exports.moduleDesc = 'Provide commands to enable react in an app.';

exports.commandsDesc = {
    'init': "Initialize the react environment",
    'newPage': "Create a new react app and a corresponding page component"
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
    fs.ensureDirSync(appModule.frontendPath);

    let appPath = appModule.absolutePath;

    shell.cd(appPath);
    let stdout = Util.runCmdSync('npm i --save-dev react react-dom prop-types');
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

    let viewPageSource = path.resolve(__dirname, 'template', 'server', 'reactPage.html');
    let viewPageDest = path.join(appModule.backendPath, Util.Literal.VIEWS_PATH, 'reactPage.html');

    if (fs.existsSync(viewPageDest)) {
        api.log('info', 'React page template already exists.');
    } else {
        fs.copySync(serverSource, serverDest);
        api.log('info', 'Created react page template.');
    }

    let locals = {
        page,
        pageComponent: Util.S(page).capitalize().s
    };

    let pageJsTemplate = path.resolve(__dirname, 'template', 'client', 'page.js.swig');
    let pageJs= swig.renderFile(pageJsTemplate, locals);

    fs.writeFileSync(path.join(appModule.frontendPath, `${page}.js`), pageJs);

    let pageComTemplate = path.resolve(__dirname, 'template', 'client', 'pageComponent.js.swig');
    let pageCom = swig.renderFile(pageComTemplate, locals);

    fs.writeFileSync(path.join(appModule.frontendPath, 'pages', `${locals.pageComponent}.js`), pageCom);
    
    api.log('info', 'Enabled react.');
};