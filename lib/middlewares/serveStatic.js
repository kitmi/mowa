"use strict";

require('debug')('tracing')(__filename);

const koaStatic = require('koa-static');
const Util = require('../util.js');

let serveStatic = (opt, appModule) => {
    return koaStatic(appModule.toAbsolutePath(opt.root || 'public'), Util._.omit(opt, 'root'));
};

serveStatic.__metaMatchMethods = ['get'];

module.exports = serveStatic;