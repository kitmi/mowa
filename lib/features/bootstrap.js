"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const Util = require('../util.js');

module.exports = {

    type: Util.Feature.INIT,

    load: function (webModule, config) {
        let p = config.path || path.join(webModule.options.backendPath, 'bootstrap');
        let bootPath = webModule.toAbsolutePath(p);

        return Util.co(function* () {
            let bp = path.join(bootPath, '**', '*.js');

            let files = yield (done => Util.glob(bp, {nodir: true}, done));

            return yield Util.coEach(files, function* (file) {
                let fn = require(file);
                yield fn(webModule);
            });
        });
    }
};