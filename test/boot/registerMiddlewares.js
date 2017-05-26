"use strict";

const test = require('../middlewares/test.js');

module.exports = (webModule) => {
    webModule.registerMiddleware('test', test);
    return Promise.resolve(this);
};