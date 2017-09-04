"use strict";

const path = require('path');
const Util = require('../util.js');

module.exports = {
    type: Util.Feature.INIT,

    load: function (appModule, oolong) {

        appModule.on('after:' + Util.Feature.DBMS, () => {

            appModule.getSchema = function (schemaName) {
                if (!schemaName) {
                    if (defaultSchema in oolong) {
                        schemaName = oolong.defaultSchema;
                    } else {
                        throw new Error('Invalid schemaName!');
                    }
                }

                let dbFile = path.join(appModule.modelsPath, schemaName + '.js');
                return require(dbFile);
            };
        });

        return Promise.resolve();
    }
};