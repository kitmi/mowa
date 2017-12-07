"use strict";

/**
 * @module Middleware_ServeStatic
 * @summary Static file server middleware
 */

const koaStatic = require('koa-static');

let serveStatic = (options, appModule) => {
    let frontendStaticPath = appModule.toAbsolutePath(options.root || appModule.options.staticPath);
    appModule.frontendStaticPath = frontendStaticPath;
    
    return koaStatic(frontendStaticPath, options);
};

serveStatic.__metaMatchMethods = ['get'];

module.exports = serveStatic;