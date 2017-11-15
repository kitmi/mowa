"use strict";

require('debug')('tracing')(__filename);

const debug = require('debug')('webpack-middleware');
const webpack = require('koa-webpack-dev');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');

module.exports = function (opt, appModule) {
    if (appModule.env !== 'development') {
        throw new Error('webpack middleware can only be used in development mode.');
    }    

    let clientDir = appModule.toAbsolutePath('client');
    let files = fs.readdirSync(clientDir);

    let entryFiles = _.reduce(files, function (result, file) {
        let full = path.join(clientDir, file);
        if (fs.statSync(full).isFile() && path.extname(file) === '.jsx') {
            result[path.basename(file, '.jsx')] = full;
        }
        return result;
    }, {});

    debug(entryFiles);
    
    let outputDir = appModule.toAbsolutePath('public');
    let features = Object.assign({ scriptPath: 'scripts', stylePath: 'styles' }, opt.features);

    debug('Output: ' + outputDir);

    opt = Object.assign({ configOptions: { entry: entryFiles, outputPath: outputDir, publicPath: '', features: features } }, opt);
    delete opt.features;

    return webpack(opt);
};