const path = require('path');
const fs = require( 'fs');
const webpack = require( 'webpack');
const webpackConfigOptions = require( 'webpack-config-options');
const _ = require( 'lodash');

const Util = require('../../../util.js');

/**
 * @module MowaCLI_Webpack
 * @summary Webpack module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to run webpack tasks.';

exports.desc = {
    'init': 'Run this command in a empty folder to initiate a new mowa project.',
    'createApp': 'Run this command to create a new app in a mowa project.'
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'build':        
            cmdOptions['app'] = {
                desc: 'Specify the name of the app to operate'
            };
            cmdOptions['for-server'] = {
                desc: 'Specify to operate against the server app',
                default: false,
                bool: true
            };
            cmdOptions['all'] = {
                desc: 'Operate against all apps',
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

function buildModule(api, moduleName) {
    api.log('info', `start webpacking web module [${moduleName}] ...`);

    let modulePath = path.join(api.base, Util.Literal.APP_MODULES_PATH, moduleName);
    let clientDir = path.join(modulePath, 'client');
    let webpackConfig = api.getConfig('webpack');

    return new Promise((resolve, reject) => {
        if (!fs.existsSync(clientDir)) {
            api.log('info', `nothing to build for [${moduleName}].`);
            return resolve();
        }

        fs.readdir(clientDir, (err, files) => {
            if (err) return reject(err);

            let entryFiles = _.reduce(files, function (result, file) {
                let full = path.join(clientDir, file);                
                
                if (fs.statSync(full).isFile() && path.extname(file) === '.jsx') {
                    result[path.basename(file, '.jsx')] = full;
                }
                return result;
            }, {});

            let outputDir = path.join(modulePath, webpackConfig.outputPath || 'public');

            var config = webpackConfigOptions(
                entryFiles,
                outputDir,
                webpackConfig.publicPath,
                Object.assign({ scriptPath: 'scripts', stylePath: 'styles' }, webpackConfig.options)
            );

            var compiler = webpack(config);
            compiler.run(function(err, stats) {
                if (err) {
                    reject(err);
                } else {
                    var jsonStats = stats.toJson("minimal");
                    if (jsonStats.errors.length > 0) {
                        reject(new Error(jsonStats.errors.join('\n')));
                    } else {
                        api.log('info', stats.toString({ chunks: false, colors: false }));
                        resolve();
                    }
                }
            });
        });
    });    
}

exports.build = function (api) {
    api.log('verbose', 'exec => mowa webpack build');
    
    let targetMod = api.getOption('target');

    return api.getWebModules().then(mods => {

        if (targetMod) {
            if (mods.indexOf(targetMod) === -1) {
                throw new Error(`Target module [${targetMod}] not found.`);
            }

            return buildModule(api, targetMod);
        }

        return Promise.all(mods.map(mod => buildModule(api, mod)));
    });
};