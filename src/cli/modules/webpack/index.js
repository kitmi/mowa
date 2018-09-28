const path = require('path');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;
const shell = require('shelljs');

const MowaHelper = require('../../mowa-helper.js');

/**
 * @module MowaCLI_Webpack
 * @summary Webpack module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to run webpack tasks.';

exports.commandsDesc = {
    'init': 'Initialize webpack environment.',
    'config': 'Regenerate webpack config',        
    'build': 'Build client bundles with webpack.'
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'init':                
            api.makeAppChoice(cmdOptions);
            break;

        case 'config':    
            api.makeAppChoice(cmdOptions);

            cmdOptions['clean-before-build'] = {
                desc: 'Clean previous output before rebuild',
                promptMessage: 'Whether to clean previous output before each build?', 
                promptDefault: false,
                alias: [ 'clean' ],                     
                bool: true,
                default: false,
                inquire: true
            };

            cmdOptions['extract-css'] = {
                desc: 'Extract CSS into separate files',
                promptMessage: 'Whether to extract CSS into separate files?', 
                promptDefault: false,
                bool: true,
                default: false,
                inquire: true
            };
            break;

        case 'build':  
            api.makeAppChoice(cmdOptions);        
            
            cmdOptions['mode'] = {
                desc: 'Webpack configuration mode',
                promptMessage: 'Environment?', 
                promptDefault: 'development',                                
                inquire: true,
                promptType: 'list',
                choicesProvider: () => [ 'development', 'production' ]
            };    
            
            cmdOptions['w'] = {
                desc: 'Watch for changes in files of the dependency graph and perform the build again',
                promptMessage: 'Watch for changes?', 
                promptDefault: false,
                alias: [ 'watch' ],                
                bool: true,
                default: false,
                inquire: () => api.getOption('mode') === 'development'
            };    
            break;

        case 'help':
        default:
            //module general options
            break;
    }

    return cmdOptions;
};

exports.init = async api => {
    api.log('verbose', 'exec => mowa webpack init');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    await exports.config(api);

    api.log('info', 'Installing webpack components ...');

    shell.cd(appModule.absolutePath);
    let stdout = Util.runCmdSync('npm i --save-dev babel-loader @babel/core @babel/preset-env @babel/preset-react ' +
        'webpack webpack-cli webpack-merge clean-webpack-plugin optimize-css-assets-webpack-plugin mini-css-extract-plugin ' +
        'ts-loader css-loader style-loader file-loader expose-loader sass-loader node-sass ' + 
        '@babel/plugin-proposal-class-properties @babel/plugin-proposal-decorators');
    shell.cd(api.base);

    api.log('verbose', stdout);
    
    let pkgFile = path.join(appModule.absolutePath, 'package.json');
    let pkgConfig = require(pkgFile);

    if (!pkgConfig.scripts['webpack']) {
        pkgConfig.scripts['webpack'] = 'webpack --config ./etc/webpack.development.js --verbose';
    }

    if (!pkgConfig.scripts['webpack:watch']) {
        pkgConfig.scripts['webpack:watch'] = 'webpack --config ./etc/webpack.development.js --watch';
    }

    if (!pkgConfig.scripts['webpack:prod']) {
        pkgConfig.scripts['webpack:prod'] = 'webpack --config ./etc/webpack.production.js';
    }

    fs.writeJsonSync(pkgFile, pkgConfig, { spaces: 4, encoding: 'utf8' });    

    api.log('info', 'Enabled webpack.');
};

exports.config = async api => {
    api.log('verbose', 'exec => mowa webpack config');

    let appModule = MowaHelper.getAppModuleToOperate(api);
    let cleanBeforeBuild = api.getOption('clean');
    let extractCss = api.getOption('extrat-css');

    //write default webpack
    const swig = require('swig-templates');
    let defaultTemplate = path.resolve(api.getTemplatePath('webpack'), 'etc', 'webpack.default.js.swig');    

    let templateValues = {
        profileName: 'browser',
        clientPath: path.relative(appModule.absolutePath, appModule.frontendPath),
        outputPath: path.relative(appModule.absolutePath, appModule.frontendStaticPath),
        publicPath: Util.ensureRightSlash(Util.ensureLeftSlash(appModule.route)),
        cleanBeforeBuild,
        extractCss
    };

    let webpackDefault = swig.renderFile(defaultTemplate, templateValues);

    fs.writeFileSync(path.join(appModule.absolutePath, 'etc', 'webpack.default.js'), webpackDefault);
    api.log('info', 'Generated webpack.default.js.');

    let devTemplate = path.resolve(api.getTemplatePath('webpack'), 'etc', 'webpack.development.js.swig');
    let webpackDev= swig.renderFile(devTemplate, templateValues);

    fs.writeFileSync(path.join(appModule.absolutePath, 'etc', 'webpack.development.js'), webpackDev);
    api.log('info', 'Generated webpack.development.js.');

    let prodTemplate = path.resolve(api.getTemplatePath('webpack'), 'etc', 'webpack.production.js.swig');
    let webpackProd= swig.renderFile(prodTemplate, templateValues);

    fs.writeFileSync(path.join(appModule.absolutePath, 'etc', 'webpack.production.js'), webpackProd);
    api.log('info', 'Generated webpack.production.js.');
};

exports.build = function (api) {
    api.log('verbose', 'exec => mowa webpack build');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    api.log('info', `Start webpacking ...`);

    let mode = api.getOption('mode');
    let cmd;

    if (api.getOption('watch')) {
        cmd = 'npm run webpack:watch';
    } else if (mode === 'production') {
        cmd = 'npm run webpack:prod';
    } else {
        cmd = 'npm run webpack';
    }

    shell.cd(appModule.absolutePath);
    let stdout = Util.runCmdSync(cmd);
    shell.cd(api.base);

    api.log('info', stdout);
};