"use strict";

require('debug')('tracing')(__filename);

const Util = require('../util.js');

module.exports = (options, webModule) => {
    return function* (next) {
        let ctrlName = this.params.resource;

        if (!options.controllers.has(ctrlName)) {
            return yield next;
        }

        this.webModule = webModule;

        let ctrl = options.controllers.get(ctrlName);

        switch (options.type) {
            case 'query':
                yield ctrl.query.call(this, next);
                break;

            case 'create':
                yield ctrl.create.call(this, next);
                break;

            case 'get':
                yield ctrl.get.call(this, next);
                break;

            case 'update':
                yield ctrl.update.call(this, next);
                break;

            case 'del':
                yield ctrl.del.call(this, next);
                break;
        }
    };
};