"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const Util = require('../util.js');

module.exports = {

    type: Util.Feature.INIT,

    load: function (appModule, config) {
        let p = config.path || path.join(appModule.options.backendPath, 'bootstrap');
        let bootPath = appModule.toAbsolutePath(p);

        let bp = path.join(bootPath, '**', '*.js');

        return new Promise((resolve, reject) => {
            Util.glob(bp, {nodir: true}, (err, files) => {
                if (err) return reject(err);
                resolve(files);
            });
        }).then(files => {
            return Promise.all(Util._.map(files, file => require(file)(appModule)));
        });
    }
};