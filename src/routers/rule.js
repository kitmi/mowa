"use strict";

const path = require('path');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const _ = Util._;

const Router = require('koa-router');

/*
 '<base path>': {
     rule: {
         middlewares:
         rules: {
             // type 1, default is "get", methods mapped to one action
             '<sub route>': '<controller with relative path>.<action>',

             // type 2, different methods mapped to different method
             '<sub route>': {
                '<method>': '<controller with relative path>.<action>'
             },

             // type 3, with middleware
             '<sub route>': {
                 '<method>': {
                    '<middleware name>': { //middleware options }
                 }
             },

             // type 4, all methods mapped to one action
             '<method>:/<sub route>': '<controller with relative path>.<action>'

             // type 5, all methods mapped to one action
             '<method>:/<sub route>': {
                 '<middleware name>': { //middleware options }
             }
         }
     }
 }
 */

const ALLOWED_METHODS = new Set(['options', 'get', 'head', 'post', 'put', 'delete', 'trace', 'connect']);

module.exports = function (appModule, baseRoute, options) {
    let controllerPath = path.join(appModule.backendPath, Mowa.Literal.CONTROLLERS_PATH);
    
    let router = baseRoute === '/' ? new Router() : new Router({prefix: baseRoute});

    if (options.middlewares) {
        appModule.useMiddlewares(router, options.middlewares);
    }

    _.forOwn(options.rules || {}, (methods, subRoute) => {
        let pos = subRoute.indexOf(':/');

        if (pos !== -1) {
            if (pos === 0) {
                throw new Mowa.Error.InvalidConfiguration(
                    'Invalid route rule syntax: ' + subRoute, 
                    appModule, 
                    `routing.${baseRoute}.rule.rules`);
            }
            
            // like get:/, or post:/

            let embeddedMethod = subRoute.substr(0, pos).toLocaleLowerCase();
            subRoute = subRoute.substr(pos + 2);

            methods = {[embeddedMethod]: methods};
        }

        subRoute = Util.ensureLeftSlash(subRoute);

        if (_.isString(methods)) {
            methods = { get: methods };
        }

        _.forOwn(methods, (middlewares, method) => {
            if (!ALLOWED_METHODS.has(method)) {
                throw new Mowa.Error.InvalidConfiguration(
                    'Unsupported http method: ' + method,
                    appModule,
                    `routing.${baseRoute}.rule.rules.${subRoute}`);
            }

            if (_.isString(middlewares)) {
                middlewares = { action: path.join(controllerPath, middlewares) };
            } else {
                if ('action' in middlewares) {
                    middlewares['action'] = path.resolve(controllerPath, middlewares['action']);
                }
            }

            appModule.addRoute(router, method, subRoute, middlewares);
        });
    });

    appModule.addRouter(router);

    return Promise.resolve();
};