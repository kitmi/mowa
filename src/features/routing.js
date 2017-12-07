"use strict";

/**
 * @module Feature_Routing
 * @summary Enable web request routing
 */

const Mowa = require('../server.js');
const Util = Mowa.Util;
const Promise = Util.Promise;

module.exports = {

    /**
     * This feature is loaded at routing stage
     * @member {string}
     */
    type: Mowa.Feature.ROUTING,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {object} routes - Routes and configuration
     * @returns {Promise.<*>}
     */
    load_: function (appModule, routes) {
        let promises = [];
        let result = Promise.resolve();

        Util._.forOwn(routes, function (routersConfig, route) {
            let mount = route;//Util.urlJoin(appModule.route, route);

            if (Util._.isObject(routersConfig)) {
                Util._.forOwn(routersConfig, function (options, type) {
                    if (appModule.serverModule.options.deaf && type !== 'mod') {
                        return;
                    }

                    let loader_ = require('../routers/' + type + '.js');
                    promises.push(() => {
                        appModule.log('verbose', `A "${type}" router is created at "${mount}" in module [${appModule.name}].`);

                        return loader_(appModule, mount, options);
                    });
                });
            } else {
                if (appModule.serverModule.options.deaf) {
                    return;
                }

                // 'route': 'method:file.function'
                let rules = {};
                rules['/'] = routersConfig;

                let loader_ = require('../routers/rule.js');
                promises.push(() => {
                    appModule.log('verbose', `A "rule" router is created at "${mount}" in module [${appModule.name}].`);

                    return loader_(appModule, mount, { rules: rules });
                });
            }
        });

        promises.forEach(promiseGenerator => {
            result = result.then(promiseGenerator);
        });

        return result;
    }
};