"use strict";

require('debug')('tracing')(__filename);

const koaCompress = require('koa-compress');

module.exports = koaCompress;