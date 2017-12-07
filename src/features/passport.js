"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const Util = require('../util.js');

const KoaPassport = require('koa-passport').KoaPassport;

module.exports = {

    type: Util.Feature.SERVICE,

    load_: function (appModule, config) {
        let passport = new KoaPassport();
        if (Util._.isEmpty(config) || !config.strategies) {
            appModule.invalidConfig('passport', 'Missing passport strategies.');
        }

        let strategies = Array.isArray(config.strategies) ? config.strategies : [ config.strategies ];
        let strategyScriptPath = config.strategiesPath || 'passport-strategies';

        let promiseFactories = Util._.map(strategies, (strategy) => () => {
            let strategyScript = path.join(appModule.backendPath, strategyScriptPath, strategy + '.js');
            let strategyInitiator = require(strategyScript);

            return Promise.resolve(strategyInitiator(appModule, passport));
        });

        appModule.registerService('passport', passport);

        return Util.eachPromise(promiseFactories);
    }
};