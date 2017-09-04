"use strict";

require('debug')('tracing')(__filename);

const winston = require('winston');
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

    load: function (webModule, categories) {
        let loggers = new (winston.Container)();

        Util._.forOwn(categories, (loggerConfig, name) => {
            if (loggerConfig.transports) {
                loggerConfig.transports = Util._.map(loggerConfig.transports, transport => {
                    if (!transport.type) {
                        throw new Util.Error.InvalidConfiguration('Missing transport type.', null, 'transport type');
                    }

                    if (webModule.options.verbose) {
                        transport.options.level = 'verbose';
                    }

                    let transportObject;

                    switch (transport.type) {
                        case 'console':
                            transportObject = new winston.transports.Console(transport.options);
                            break;

                        case 'http':
                            transportObject = new winston.transports.Http(transport.options);
                            break;

                        case 'mail':
                            let Mail = require('winston-mail').Mail;
                            transportObject = new Mail(transport.options);
                            break;

                        case 'mongodb':
                            let MongoDb = require('winston-mongodb').MongoDB;
                            transportObject = new MongoDb(transport.options);
                            break;

                        case 'file':
                        case 'dailyRotateFile':
                            let fullPath = path.resolve(webModule.absolutePath, transport.options.filename);
                            let dir = path.dirname(fullPath);

                            Util.fs.ensureDirSync(dir);

                            let fileBasedOptions = Object.assign({}, transport.options, {filename: fullPath});
                            let TransportsClass;

                            if (transport.type === 'file') {
                                TransportsClass = winston.transports.File;
                            } else {
                                require('winston-daily-rotate-file');
                                TransportsClass = winston.transports.DailyRotateFile;
                            }
                            transportObject = new TransportsClass(fileBasedOptions);
                            break;

                        default:
                            throw new Util.Error.InvalidConfiguration('Unsupported transport type.', null, 'transport type');
                    }

                   return transportObject;
                });
            }

            let logger = loggers.add(name, loggerConfig);
            webModule.registerService('logger:' + name, logger);
        });

        webModule.registerService('loggers', loggers);

        webModule.getLogger = function(loggerId) {
            let logger = webModule.getService('logger:' + loggerId);

            if (!logger) {
                throw new Error(`Logger [${loggerId}] not found.`);
            }

            return logger;
        };

        return Promise.resolve();
    }
};