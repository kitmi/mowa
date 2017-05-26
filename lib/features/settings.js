"use strict";

require('debug')('tracing')(__filename);

const Util = require('../util.js');

module.exports = {

    type: Util.Feature.INIT,

    load: function (webModule, config) {
        webModule.settings = Object.assign({}, config, webModule.settings);
        return Promise.resolve();
    }
};