"use strict";

/**
 * @module Middleware_ServeStatic
 * @summary Static file server middleware
 */

const koaStatic = require('koa-static');

const Mowa = require('../server.js');

let serveStatic = (options, appModule) => {
    options || (options = {});

    let frontendStaticPath = appModule.toAbsolutePath(options.root || Mowa.Literal.FRONTEND_STATIC_PATH);
    appModule.frontendStaticPath = frontendStaticPath;
    
    return koaStatic(frontendStaticPath, options);
};

serveStatic.__metaMatchMethods = ['get'];

module.exports = serveStatic;