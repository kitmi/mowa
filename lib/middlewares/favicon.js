"use strict";

require('debug')('tracing')(__filename);

const koaFavIcon = require('koa-favicon');

let favicon = (opt, webModule) => {
    return koaFavIcon(webModule.toAbsolutePath(opt));
};

favicon.__metaMatchMethods = ['get'];

module.exports = favicon;