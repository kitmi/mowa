"use strict";

require('debug')('tracing')(__filename);

const koaStatic = require('koa-static');
const Util = require('../util.js');

let serveStatic = (opt, appModule) => {
    let frontendStaticPath = appModule.toAbsolutePath(opt.root || appModule.options.staticPath);
    appModule.frontendStaticPath = frontendStaticPath;
    
    return koaStatic(frontendStaticPath, Util._.omit(opt, 'root'));
};

serveStatic.__metaMatchMethods = ['get'];

module.exports = serveStatic;