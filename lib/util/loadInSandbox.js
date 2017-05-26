"use strict";

require('debug')('tracing')(__filename);

var System = require('systemjs');

module.exports = function (file, variables, deps) {
    var loader = new System.constructor();

    if (variables) {
        loader.config({'global': variables});
    }

    if (deps) {
        for (var k in deps) {
            loader.set(k, deps[k]);
        }
    }

    return loader.import(file);
};