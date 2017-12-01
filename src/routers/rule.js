"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const Util = require('../util.js');
const Router = require('koa-router');

/*
 '<base path>': {
     rule: {
         controllers:
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

module.exports = function loadRuleRouter(appModule, baseRoute, options) {
    options = Object.assign({
        controllers: path.join(appModule.backendPath, 'controllers')
    }, options);

    let router = baseRoute === '/' ? new Router() : new Router({prefix: baseRoute});

    if (options.middlewares) {
        appModule.useMiddlewares(router, options.middlewares);
    }

    if (!options.rules) {
        appModule.invalidConfig('routes.*.rule', 'Missing rules definition.');
    }

    Util._.forOwn(options.rules, (methods, subRoute) => {
        let pos = subRoute.indexOf(':/');

        if (pos != -1) {
            if (pos == 0) {
                appModule.invalidConfig('routes.*.rule.rules', 'Unrecognized route rule syntax: ' + subRoute);
            }
            
            // like get:/, or post:/

            let embeddedMethod = subRoute.substr(0, pos).toLocaleLowerCase();
            subRoute = subRoute.substr(pos + 2);

            methods = {[embeddedMethod]: methods};
        }

        subRoute = Util.ensureLeftSlash(subRoute);

        if (Util._.isString(methods)) {
            methods = { get: methods };
        }

        Util._.forOwn(methods, (middlewares, method) => {
            if (!ALLOWED_METHODS.has(method)) {
                appModule.invalidConfig('routes.*.rule.rules', 'Unsupported http method: ' + method);
            }

            if (Util._.isString(middlewares)) {
                middlewares = { action: path.join(options.controllers, middlewares) };
            } else {
                if ('action' in middlewares) {
                    middlewares['action'] = path.join(options.controllers, middlewares['action']);
                }
            }

            appModule.addRoute(router, method, subRoute, middlewares);
        });
    });

    appModule.addRouter(router);

    return Promise.resolve();
};