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
     * @property {array} config.strategies - Passport strategies, e.g. [ 'local', 'facebook' ]
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

        appModule.registerService('passport', passport);

        let strategies = Array.isArray(config.strategies) ? config.strategies : [ config.strategies ];

        return Util.eachAsync_(strategies, async strategy => {
            let strategyScript = path.join(appModule.backendPath, 'passports', strategy + '.js');
            let strategyInitiator = require(strategyScript);
            return strategyInitiator(appModule, passport);
        });
    }
};