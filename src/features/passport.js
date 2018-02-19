"use strict";

/**
 * @module Feature_Passport
 * @summary Enable passport feature
 */

const path = require('path');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const Promise = Util.Promise;

const KoaPassport = require('koa-passport').KoaPassport;

module.exports = {

    /**
     * This feature is loaded at service stage
     * @member {string}
     */
    type: Mowa.Feature.SERVICE,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {object} config - Passport settings
     * @returns {Promise.<*>}
     */
    load_: function (appModule, config) {
        if (appModule.serverModule.options.deaf) return Promise.resolve();

        let passport = new KoaPassport();
        if (Util._.isEmpty(config) || !config.strategies) {
            throw new Mowa.Error.InvalidConfiguration('Missing passport strategies.',
                appModule,
                'passport.strategies'
            );
        }

        let strategies = Array.isArray(config.strategies) ? config.strategies : [ config.strategies ];        

        let promiseFactories = Util._.map(strategies, (strategy) => () => {
            let strategyScript = path.join(appModule.backendPath, 'passportStrategies', strategy + '.js');
            let strategyInitiator = require(strategyScript);

            return Promise.resolve(strategyInitiator(appModule, passport));
        });

        appModule.registerService('passport', passport);

        return Util.eachPromise_(promiseFactories);
    }
};