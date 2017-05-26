"use strict";

require('debug')('tracing')(__filename);

const Util = require('../util.js');

module.exports = (options, webModule) => {
    return function* (next) {
        let ctrlName = this.params.controller;

        if (!options.controllers.has(ctrlName)) {
            return yield next;
        }

        this.webModule = webModule;

        let ctrl = options.controllers.get(ctrlName);
        let method = this.body.method;

        if (!method || typeof ctrl[method] !== 'function') {
            this.throw(Util.HttpCode.HTTP_BAD_REQUEST);
        }

        this.rpcData = this.body.data;
        let actioner = ctrl[method];

        yield actioner.call(this, next);
    };
};