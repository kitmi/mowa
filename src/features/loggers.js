"use strict";

/**
 * @module Feature_Loggers
 * @summary Enable multi-categories logging by winston logger
 */

const winston = require('winston');
const winstonFlight = require('winstonflight');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const Promise = Util.Promise;

/*

 loggers: {
     'logger1': {
         transports: [
             {type: 'console', options: {colorize: true}},
             {type: 'file', options: {filename: 'test/temp/test-logger.log'}}
         ]
     },
     'logger2': {
         transports: [
             {type: 'console', options: {colorize: true}},
             {type: 'file', options: {filename: 'test/temp/test-logger.log'}}
         ]
     }
 }

 */

module.exports = {

    /**
     * This feature is loaded at service stage
     * @member {string}
     */
    type: Mowa.Feature.SERVICE,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {object} categories - Configuration for multi-categories
     * @returns {Promise.<*>}
     * @example
     *  let loggers = appModule.getService('loggers');
     *  let logger = loggers.get('category');
     *  logger.log('info', 'information');
     *  logger.log('warn', 'warning');
     *
     *  let logger = appModule.getService('logger:category');
     *  logger.log('error', 'error');
     */
    load_: function (appModule, categories) {
        let loggers = new (winston.Container)();

        Util._.forOwn(categories, (loggerConfig, name) => {
            if (loggerConfig.transports) {
                loggerConfig.transports = winstonFlight(loggerConfig.transports);
            }

            let logger = loggers.add(name, loggerConfig);
            
            appModule.registerService('logger:' + name, logger);
        });

        appModule.registerService('loggers', loggers);

        return Promise.resolve();
    }
};