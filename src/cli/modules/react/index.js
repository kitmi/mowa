"use strict";

const path = require('path');
const shell = require('shelljs');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;

const Mowa = require('../../../server.js');
const MowaHelper = require('../../mowa-helper.js');

const reactComponents = require('./components.js');

/**
 * @module MowaCLI_App
 * @summary Application module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to enable react in an app.';

exports.commandsDesc = {
    'init': "Initialize the react environment",
    'createApp': "Create a react page entry file and the corresponding page component",
    'createPage': "Create a page component",
    'createComponent': "Create a reusable component",
    'createPackage': "Create a npm package of components",
    'install': "Install react component"
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'init':
            api.makeAppChoice(cmdOptions);
            break;

        case 'install':
            api.makeAppChoice(cmdOptions);

            cmdOptions['package'] = {
                desc: 'The name of the react component package to install',
                promptMessage: 'Select the target package group:',
                alias: [ 'pkg' ],
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(reactComponents.componentGroup)
            };
            break;

        case 'createApp':
            api.makeAppChoice(cmdOptions);

            cmdOptions['page'] = {
                desc: 'The name of the entry page to create',
                required: true,
                inquire: true
            };
            break;

        case 'createPage':
            api.makeAppChoice(cmdOptions);

            cmdOptions['page'] = {
                desc: 'The name of the page component to create',
                required: true,
                inquire: true
            };
            break;

        case 'createComponent':
            api.makeAppChoice(cmdOptions);

            cmdOptions['component'] = {
                desc: 'The name of the component to create',
                alias: [ 'c', 'com' ],
                required: true,
                inquire: true
            };
            cmdOptions['type'] = {
                desc: 'Specify the type of component',
                alias: [ 't' ],
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve([ 'class', 'function' ])
            };
            break;

        case 'createPackage':            
            cmdOptions['package'] = {
                desc: 'The name of the package to create',
                alias: [ 'p', 'pkg' ],
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

    let appModule = MowaHelper.getAppModuleToOperate(api);

    api.log('info', 'Initializing react development environment.');

    //make sure client folder exist
    let utilsPath = path.join(appModule.frontendPath, 'utils');
    fs.ensureDirSync(utilsPath);

    let mowaUtilSource = path.join(api.getTemplatePath('react'), 'client', 'utils', 'mowa.js');
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
    
    let pkgName = api.getOption('pkg');
    assert: {        
        pkgName, Util.Message.DBC_VAR_NOT_NULL;
    }

    let appModule = MowaHelper.getAppModuleToOperate(api);
    
    let pkgs = reactComponents.componentPackages[pkgName];
    let pkgsLine = pkgs.join(' ');

    let appPath = appModule.absolutePath;

    shell.cd(appPath);
    let stdout = Util.runCmdSync(`npm i --save-dev ${pkgsLine}`);
    shell.cd(api.base);

    api.log('info', stdout);
    api.log('info', `Installed react component: ${pkgsLine}.`);
};

exports.createApp = async api => {
    api.log('verbose', 'exec => mowa react createApp');

    let page = api.getOption('page');
    assert: {
        page, Util.Message.DBC_VAR_NOT_NULL;
    }

    page = _.camelCase(page);

    let appModule = MowaHelper.getAppModuleToOperate(api);

    const swig  = require('swig-templates');
    let viewPageSource = path.resolve(api.getTemplatePath('react'), 'server', 'react.swig');
    let viewPageDest = appModule.toAbsolutePath(Mowa.Literal.BACKEND_SRC_PATH, Mowa.Literal.VIEWS_PATH, 'react.swig');

    if (fs.existsSync(viewPageDest)) {
        api.log('info', 'React page exists. Skipped this step.');
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
            pageComponent: Util.pascalCase(page)
        };

        let pageJsTemplate = path.resolve(api.getTemplatePath('react'), 'client', 'page.js.swig');
        let pageJs= swig.renderFile(pageJsTemplate, locals);

        fs.writeFileSync(targetPage, pageJs);

        api.log('info', `Created a new react entry page "${page}".`);
    }

    return exports.createPage(api);
};

exports.createPage = async api => {
    api.log('verbose', 'exec => mowa react createPage');

    let page = api.getOption('page');
    assert: {
        page, Util.Message.DBC_VAR_NOT_NULL;
    }

    let pageComponent = _.upperFirst(_.camelCase(page));

    let appModule = MowaHelper.getAppModuleToOperate(api);

    const swig  = require('swig-templates');

    let locals = {
        pageComponent
    };

    let componentsPath = path.join(appModule.frontendPath, 'pages');
    let pageComTemplate = path.resolve(api.getTemplatePath('react'), 'client', 'pageComponent.js.swig');
    let pageCom = swig.renderFile(pageComTemplate, locals);

    fs.ensureDirSync(componentsPath);
    fs.writeFileSync(path.join(componentsPath, `${pageComponent}.js`), pageCom);
    api.log('info', `Created a new react page component "pages/${pageComponent}".`);
};

exports.createComponent = api => {
    api.log('verbose', 'exec => mowa react createComponent');

    let component = api.getOption('component');
    let type = api.getOption('type');
    assert: {
        component, Util.Message.DBC_VAR_NOT_NULL;
    }

    component = _.upperFirst(_.camelCase(component));

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let componentsPath = path.join(appModule.frontendPath, 'components');
    let targetComponent = path.join(componentsPath, `${component}.js`);
    if (fs.existsSync(targetComponent)) {
        api.log('info', `React component "${component}.js" already exists.`);
    } else {
        let locals = {
            component
        };

        const swig = require('swig-templates');

        let componentJsTemplate = path.resolve(api.getTemplatePath('react'), 'client', type + 'Component.js.swig');
        let componentJs= swig.renderFile(componentJsTemplate, locals);

        fs.ensureDirSync(componentsPath);
        fs.writeFileSync(targetComponent, componentJs);

        api.log('info', `Created a new react component "components/${component}".`);
    }
};

exports.createPackage = api => {
    api.log('verbose', 'exec => mowa react createPackage');

    let pkg = api.getOption('package');
    assert: {
        pkg, Util.Message.DBC_VAR_NOT_NULL;
    }

    pkg = _.trim(_.kebabCase(pkg), '-');

    let packagesPath = path.join(api.base, 'packages');
    fs.ensureDirSync(packagesPath);

    let pkgs = fs.readdirSync(packagesPath, 'utf8');
    let pkgNum = _.filter(pkgs, f => fs.lstatSync(path.join(packagesPath, f)).isDirectory()).length;

    let targetPackage = path.join(packagesPath, pkg);
    if (fs.existsSync(targetPackage)) {
        api.log('info', `React components package "${pkg}.js" already exists.`);
    } else {
        const startingPort = 8310;

        let templatesSrc = api.getTemplatePath('react-component');

        fs.copySync(templatesSrc, targetPackage);

        let pkgFile = path.join(targetPackage, 'package.json');
        let pkgJson = require(pkgFile);
        pkgJson.name = pkg;

        let authorName = Util.runCmdSync('git config --global user.name').trim();
        let authorEmail = Util.runCmdSync('git config --global user.email').trim();

        pkgJson.author = `${authorName} <${authorEmail}>`;

        fs.writeJsonSync(pkgFile, pkgJson, {spaces: 4, EOL: '\n'});        

        const webpackJsFile = path.join(targetPackage, 'webpack.config.js');
        let webpackJsTemplateContent = fs.readFileSync(webpackJsFile, 'utf8');
        let webpackJsContent = Util.template(webpackJsTemplateContent, {port: startingPort + pkgNum});
        fs.writeFileSync(webpackJsFile, webpackJsContent, 'utf8');    

        api.log('info', `Created a new react components package "packages/${pkg}".`);
    }
};