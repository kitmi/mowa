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

module.exports = function loadRestRouter(webModule, baseRoute, options) {
    options = Object.assign({
        resources: path.join(webModule.options.backendPath, 'resources')
    }, options);

    let router = baseRoute === '/' ? new Router() : new Router({prefix: baseRoute});

    if (options.middlewares) {
        webModule.useMiddlewares(router, options.middlewares);
    }

    let ctrlsMap = new Map();

    let resourcesPath = webModule.toAbsolutePath(options.resources, "*.js");
    let files = Util.glob.sync(resourcesPath, {nodir: true});

    Util._.each(files, file => {
        let urlName = Util.S(path.basename(file, '.js')).underscore().s;
        ctrlsMap.set(urlName, require(file));
    });

    webModule.addRoute(router, 'get', '/:resource', { restAction: { type: 'query', controllers: ctrlsMap } });
    webModule.addRoute(router, 'post', '/:resource', { restAction: { type: 'create', controllers: ctrlsMap } });
    webModule.addRoute(router, 'get', '/:resource/:id', { restAction: { type: 'get', controllers: ctrlsMap } });
    webModule.addRoute(router, 'put', '/:resource/:id', { restAction: { type: 'update', controllers: ctrlsMap } });
    webModule.addRoute(router, 'del', '/:resource/:id', { restAction: { type: 'del', controllers: ctrlsMap } });

    webModule.addRouter(router);

    return Promise.resolve();
};