"use strict";

require('debug')('tracing')(__filename);

const AppModule = require('../appmodule.js');
const util = require('util');

/*
 '<base path>': {
     mod: {
         modules: ''
         name:
         options: {

         },
        overrides: {
        }
     }
 }
 */

module.exports = function loadModRouter(appModule, baseRoute, config) {
    if (!config.name) {
        appModule.invalidConfig('routes.*.mod', 'Missing module name.');
    }

    let options = Object.assign({verbose: appModule.options.verbose}, config.options);

    let mod = new AppModule(appModule, config.name, baseRoute, options);
    mod.settings = config.settings || {};
    appModule.consoleVerbose(`Loading web module [${mod.name}] from "${mod.path}"`);

    return mod.start(config.overrides).then(() => {
        appModule.log('verbose', `App [${mod.name}] is loaded.`);
        appModule.addChildModule(baseRoute, mod);
    }).catch(reason => {
        appModule.log('error', `Failed to load app [${mod.name}]`);
        throw reason;
    });
};