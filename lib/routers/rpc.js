"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const Util = require('../util.js');
const Router = require('koa-router');
const inflection = require('inflection');

/*
 '<base path>': {
     rpc: {
         rpc-controllers:
         middlewares:
     }
 }

 route                          http method    body of request
 /:resource                      post           { method, data }
*/

module.exports = function loadRpcRouter(webModule, baseRoute, options) {
    options = Object.assign({
        controllers: path.join(webModule.options.backendPath, 'rpc')
    }, options);

    let router = baseRoute === '/' ? new Router() : new Router({prefix: baseRoute});

    if (options.middlewares) {
        webModule.useMiddlewares(router, options.middlewares);
    }

    let ctrlsMap = new Map();

    let controllersPath = webModule.toAbsolutePath(options.controllers, '*.js');
    let files = Util.glob.sync(controllersPath, {nodir: true});

    Util._.each(files, file => {
        let urlName = Util.S(path.basename(file, '.js')).slugify().s;
        ctrlsMap.set(urlName, require(file));
    });

    webModule.addRoute(router, 'post', '/:controller', { remoteCall: { controllers: ctrlsMap } });

    webModule.addRouter(router);

    return Promise.resolve();
};