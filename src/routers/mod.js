"use strict";

const path = require('path');

const Mowa = require('../server.js');
const Util = Mowa.Util;
const _ = Util._;
const Promise = Util.Promise;

const AppModule = require('../appmodule.js');

/*
 '<base path>': {
     mod: {
         name:
         npmModule: false,
         options: { // module options

         },
         settings: { // can be referenced in config file
         },
        features: { // override the module config
        }
     }
 }
 */

module.exports = function (appModule, baseRoute, config) {
    if (!config.name) {
        throw new Mowa.Error.InvalidConfiguration(
            'Missing module name.',
            appModule,
            `routing.${baseRoute}.mod`);
    }

    let options = Object.assign({verbose: appModule.options.verbose}, config.options);
    if (options.npmModule && !options.modulePath) {
        options.modulePath = path.join('node_modules', config.name);
    }

    let mod = new AppModule(appModule, config.name, baseRoute, options);
    mod.settings = config.settings || {};
    let relativePath = path.relative(appModule.serverModule.absolutePath, mod.absolutePath);
    appModule.log('verbose', `Loading web module [${mod.name}] from "${relativePath}"`);

    return mod.start_(config.features).then(() => {
        appModule.log('verbose', `App [${mod.name}] is loaded.`);
        appModule.addChildModule(baseRoute, mod);
    }).catch(reason => {
        appModule.log('error', `Failed to load app [${mod.name}]`);
        throw reason;
    });
};