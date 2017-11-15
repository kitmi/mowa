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

module.exports = function loadRpcRouter(appModule, baseRoute, options) {
    options = Object.assign({
        controllers: path.join(appModule.options.backendPath, 'rpc')
    }, options);

    let router = baseRoute === '/' ? new Router() : new Router({prefix: baseRoute});

    if (options.middlewares) {
        appModule.useMiddlewares(router, options.middlewares);
    }

    let ctrlsMap = new Map();

    let controllersPath = appModule.toAbsolutePath(options.controllers, '*.js');
    let files = Util.glob.sync(controllersPath, {nodir: true});

    Util._.each(files, file => {
        let urlName = Util.S(path.basename(file, '.js')).slugify().s;
        ctrlsMap.set(urlName, require(file));
    });

    appModule.addRoute(router, 'post', '/:controller', { remoteCall: { controllers: ctrlsMap } });

    appModule.addRouter(router);

    return Promise.resolve();
};