"use strict";

const _ = require('lodash');
const S = require('string');
const path = require('path');
const fs = require('fs');
const Linker = require('../lang/linker.js');

module.exports = function (appModule, context, schemaFile, mode) {
    let linker = new Linker(context);
    let schemaModule = linker.loadModule(schemaFile);

    let promises = [];

    _.forOwn(schemaModule.database, (db, dbName) => {
        let dataDir = appModule.toAbsolutePath(appModule.options.backendPath, 'db', db.type, dbName, mode);
        let dataListFile = path.join(dataDir, 'index.list');

        if (!fs.existsSync(dataListFile)) {
            promises.push(Promise.reject(`Data entry list file "${dataListFile}" not found.`));
            return;
        }

        let dataList = S(fs.readFileSync(dataListFile)).lines();
        let dbDeployer = require(`./db/${db.type}.js`);        
        
        _.each(dataList, line => {
            line = line.trim();
            
            if (line.length > 0) {
                let dataFile = path.join(dataDir, line);
                if (!fs.existsSync(dataFile)) {
                    promises.push(Promise.reject(`Data file "${dataFile}" not found.`));
                    return;
                }
                
                promises.push(dbDeployer.importData(appModule, context, dbName, db, dataFile));            
            }
        });        
    });

    return Promise.all(promises);
};

