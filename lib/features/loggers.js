"use strict";

require('debug')('tracing')(__filename);

const winston = require('winston');
const winstonFlight = require('winstonflight');
const path = require('path');
const Util = require('../util.js');

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

    type: Util.Feature.SERVICE,

    load: function (appModule, categories) {
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