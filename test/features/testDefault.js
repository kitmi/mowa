"use strict";

const Util = require('../../lib/util.js');

module.exports = {

    type: Util.Feature.LEVEL_INIT,

    load: function (webModule, config) {

        console.log('testDefault loaded.');

        return Promise.resolve(config);
    }
};