"use strict";

require('debug')('tracing')(__filename);

const koaMethodOverride = require('koa-methodoverride');
const Util = require('../util.js');

let methodOverride = (opt) => {
    return koaMethodOverride(opt.getter, Util._.omit(opt, 'getter'));
};

module.exports = methodOverride;