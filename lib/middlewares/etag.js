"use strict";

require('debug')('tracing')(__filename);

const koaEtag = require('koa-etag');

module.exports = koaEtag;