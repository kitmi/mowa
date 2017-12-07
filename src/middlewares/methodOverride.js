"use strict";

/**
 * @module Middleware_MethodOverride
 * @summary HTTP method override middleware
 */

const koaMethodOverride = require('koa-methodoverride');
const Util = require('../util.js');

module.exports = (opt) => koaMethodOverride(opt.getter, Util._.omit(opt, 'getter'));