"use strict";

const _ = require('lodash');
const Linker = require('../lang/linker.js');

module.exports = function (appModule, context, schemaFile, reset = false) {
    let linker = new Linker(context);
    let schemaModule = linker.loadModule(schemaFile);    

    let promises = [];

    _.forOwn(schemaModule.schema, (schemaSettings, dbName) => {
        _.each(schemaSettings.deployments, dbConnectionKey => {
            let dbInfo = schemaModule.database[dbConnectionKey];

            if (!dbInfo) {
                throw new Error('Unexpected state!');
            }

            let dbDeployer = require(`./db/${dbInfo.type}.js`);
            promises.push(dbDeployer.deploy(appModule, context, dbName, dbConnectionKey, dbInfo, reset));
        });


    });

    return Promise.all(promises);
};
