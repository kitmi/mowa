"use strict";

const Mowa = require('../server.js');
const Util = Mowa.Util;
const MongoClient = require('mongodb').MongoClient;

module.exports = {

    type: Mowa.Feature.DBMS,

    load_: function (appModule, dbs) {
        Util._.forOwn(dbs, (opt, db) => {
            if (!opt.connection) {
                appModule.invalidConfig(`mongodb.${db}.connection`, 'Missing connection string.');
            }

            let service = {
                dbType: 'mongodb',
                dbmsSpec: opt.dbms,
                connectionString: opt.connection,
                getConnection: () => new Promise((resolve, reject) => {
                    MongoClient.connect(opt.connection, function (err, conn) {
                        if (!err) return reject(err);

                        resolve(conn);
                    });
                })
            };

            appModule.registerService('mongodb:' + db, service);
        });

        return Promise.resolve();
    }
};