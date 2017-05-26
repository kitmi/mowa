const path = require('path');
const fs = require( 'fs');
const webpack = require( 'webpack');
const webpackConfigOptions = require( 'webpack-config-options');
const _ = require( 'lodash');

const Util = require('../../../util.js');

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

exports.desc = {
    'desc': 'Provide commands to initiate a new project or create a new app.',
    'init': 'Run this command in a empty folder to initiate a new mowa project.',
    'createApp': 'Run this command to create a new app in a mowa project.'
};

exports.help = function (api) {
    api.log('verbose', 'exec => mowa webpack help');

    api.showUsage();
};

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