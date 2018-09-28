"use strict";

const path = require('path');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const _ = Util._;
const Promise = Util.Promise;

const Router = require('koa-router');

/*
 '<base path>': {    
    modules: [
        {
            middlewares: 
            controller: 
        },
        'controller'
    ]
 }
 */

module.exports = function (appModule, baseRoute, options) {
    let controllerPath = path.join(appModule.backendPath, Mowa.Literal.CONTROLLERS_PATH);

    let moduleItems = _.castArray(options);

    let defaultRouter = baseRoute === '/' ? new Router() : new Router({prefix: baseRoute});
    let useDefaultRouter = false;
    
    moduleItems.forEach((moduleItem, index) => {
        if (typeof moduleItem === 'string') {
            // [ 'controllerName' ]
            moduleItem = {                
                controller: moduleItem
            };
        }

        let router = defaultRouter;
        let moduleBaseRoute = moduleItem.route || '';

        if (moduleItem.middlewares) {            
            //module-wide middlewares
            moduleBaseRoute = '/';

            let currentPrefix = Util.urlJoin(baseRoute, moduleItem.route || '');
            router = currentPrefix === '/' ? new Router() : new Router({prefix: currentPrefix});
            
            appModule.useMiddlewares(router, moduleItem.middlewares);
        } 

        let controllerFile = path.join(controllerPath, moduleItem.controller + '.js');
        let controller;

        try {
            controller = require(controllerFile);
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Mowa.Error.InvalidConfiguration(
                    `Controller "${moduleItem.controller}" not found.`,
                    appModule,
                    `routing[${baseRoute}].modules[${index}]`
                );
            }

            throw error;
        }
                
        _.forOwn(controller, (action, actionName) => {      
            let httpMethod = _.castArray(action.__metaHttpMethod);            
            let subRoute = Util.urlJoin(moduleBaseRoute, action.__metaRoute, actionName);            

            _.each(httpMethod, method => {
                if (!Mowa.Literal.ALLOWED_HTTP_METHODS.has(method)) {
                    throw new Mowa.Error.InvalidConfiguration(
                        'Unsupported http method: ' + method,
                        appModule,
                        `routing.${baseRoute}.modules ${moduleItem.controller}.${actionName}`);
                }                
    
                appModule.addRoute(router, method, subRoute, action.__metaMiddlewares ? action.__metaMiddlewares.concat([appModule.wrapAction(action)]) : appModule.wrapAction(action));
            });
        });

        if (router === defaultRouter) {
            useDefaultRouter = true;
        } else {
            appModule.addRouter(router);
        }
    });

    if (useDefaultRouter) {
        appModule.addRouter(defaultRouter);
    }    

    return Promise.resolve();
};