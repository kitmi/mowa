"use strict";

require('debug')('tracing')(__filename);

const Util = require('../util.js');

module.exports = {

    type: Util.Feature.ROUTING,

    load: function (webModule, routes) {
        let promises = [];
        let result = Promise.resolve();

        Util._.forOwn(routes, function (routersConfig, route) {
            let mount = route;//Util.urlJoin(webModule.route, route);

            if (Util._.isObject(routersConfig)) {
                Util._.forOwn(routersConfig, function (options, type) {
                    if (webModule.serverModule.options.deaf && type !== 'mod') {
                        return;
                    }

                    let loader = require('../routers/' + type + '.js');
                    promises.push(() => {
                        webModule.log('verbose', `A "${type}" router is created at "${mount}" in module [${webModule.name}].`);

                        return loader(webModule, mount, options);
                    });
                });
            } else {
                if (webModule.serverModule.options.deaf) {
                    return;
                }

                // 'route': 'method:file.function'
                let rules = {};
                rules['/'] = routersConfig;

                let loader = require('../routers/rule.js');
                promises.push(() => {
                    webModule.log('verbose', `A "rule" router is created at "${mount}" in module [${webModule.name}].`);

                    return loader(webModule, mount, { rules: rules });
                });
            }
        });

        promises.forEach(promiseGenerator => {
            result = result.then(promiseGenerator);
        });

        return result;
    }
};