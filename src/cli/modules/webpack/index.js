const path = require('path');
const webpack = require( 'webpack');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const shell = require('shelljs');

const MowaHelper = require('../../mowa-helper.js');

/**
 * @module MowaCLI_Webpack
 * @summary Webpack module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to run webpack tasks.';

exports.commandsDesc = {
    'init': 'Initialize webpack environment.',
    'build': 'Build client bundles with webpack.'
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'init':
            cmdOptions['app'] = {
                desc: 'The name of the app to be operate',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            break;

        case 'build':        
            cmdOptions['app'] = {
                desc: 'The name of the app to be operate',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
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
    api.log('verbose', 'exec => mowa webpack init');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    //write default webpack
    const swig  = require('swig-templates');
    let defaultTemplate = path.resolve(__dirname, 'template', 'etc', 'webpack.default.js.swig');
    let webpackOptions = Util.getValueByPath(appModule.settings, 'deploy.webpack', {});
    
    let webpackDefault = swig.renderFile(defaultTemplate, {
        profileName: 'browser',
        clientPath: appModule.frontendPath,
        outputPath: appModule.frontendStaticPath,
        publicPath: appModule.publicUrl,
        cleanBeforeBuild: webpackOptions.cleanBeforeBuild || false
    });
    
    fs.writeFileSync(path.join(appModule.absolutePath, 'etc', 'webpack.default.js'), webpackDefault);
    api.log('info', 'Generated webpack.default.js.');

    let devTemplate = path.resolve(__dirname, 'template', 'etc', 'webpack.development.js.swig');
    let webpackDev= swig.renderFile(devTemplate, {
    });

    fs.writeFileSync(path.join(appModule.absolutePath, 'etc', 'webpack.development.js'), webpackDev);
    api.log('info', 'Generated webpack.development.js.');

    let prodTemplate = path.resolve(__dirname, 'template', 'etc', 'webpack.development.js.swig');
    let webpackProd= swig.renderFile(prodTemplate, {
    });

    fs.writeFileSync(path.join(appModule.absolutePath, 'etc', 'webpack.production.js'), webpackProd);
    api.log('info', 'Generated webpack.production.js.');

    shell.cd(appModule.absolutePath);
    let stdout = Util.runCmdSync('npm i --save-dev babel-loader babel-core babel-preset-env babel-preset-react webpack webpack-merge extract-text-webpack-plugin css-loader style-loader file-loader');
    shell.cd(api.base);

    api.log('verbose', stdout);
    api.log('info', 'Enabled webpack.');
};

exports.build = function (api) {
    api.log('verbose', 'exec => mowa webpack build');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    api.log('info', `Start webpacking app [${appName}] ...`);

    let env = api.getOption('env');

    let config = require(appModule.toAbsolutePath('etc', 'webpack.' + env + '.js'));

    var compiler = webpack(config);

    return new Promise((resolve, reject) => {
        compiler.run(function (err, stats) {
            if (err) {
                reject(err);
            } else {
                var jsonStats = stats.toJson("minimal");
                if (jsonStats.errors.length > 0) {
                    reject(jsonStats.errors.join('\n'));
                } else {
                    api.log('verbose', stats.toString({chunks: false, colors: false}));
                    api.log('info', `Client source files of app "${appName}" are webpacked successfully.`);
                    resolve();
                }
            }
        });
    });
};