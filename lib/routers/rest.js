"use strict";

const path = require('path');
const Util = require('../util.js');
const Router = require('koa-router');

/*
 '<base path>': {
     rest: {
         resources:
         middlewares:
     }
 }

 route                          http method    function of ctrl
 /:resource                      get            query
 /:resource                      post           create
 /:resource/:id                  get            get
 /:resource/:id                  put            update
 /:resource/:id                  del            del
 */

module.exports = function loadRestRouter(appModule, baseRoute, options) {
    options = Object.assign({
        resources: path.join(appModule.options.backendPath, 'resources')
    }, options);

    let router = baseRoute === '/' ? new Router() : new Router({prefix: baseRoute});

    if (options.middlewares) {
        appModule.useMiddlewares(router, options.middlewares);
    }

    let ctrlsMap = new Map();

    let resourcesPath = appModule.toAbsolutePath(options.resources, "*.js");
    let files = Util.glob.sync(resourcesPath, {nodir: true});

    Util._.each(files, file => {
        let urlName = Util.S(path.basename(file, '.js')).underscore().s;
        ctrlsMap.set(urlName, require(file));
    });

    appModule.addRoute(router, 'get', '/:resource', { restAction: { type: 'query', controllers: ctrlsMap } });
    appModule.addRoute(router, 'post', '/:resource', { restAction: { type: 'create', controllers: ctrlsMap } });
    appModule.addRoute(router, 'get', '/:resource/:id', { restAction: { type: 'get', controllers: ctrlsMap } });
    appModule.addRoute(router, 'put', '/:resource/:id', { restAction: { type: 'update', controllers: ctrlsMap } });
    appModule.addRoute(router, 'del', '/:resource/:id', { restAction: { type: 'del', controllers: ctrlsMap } });

    appModule.addRouter(router);

    return Promise.resolve();
};