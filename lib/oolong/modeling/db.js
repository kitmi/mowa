"use strict";

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');

class DbModeler {
    constructor(linker, options) {
        this.linker = linker;

        this.options = Object.assign({
            buildPath: './build',
            db: {
                mysql: {
                    dbSpecification: {
                        characterSet: 'utf8',
                        collate: 'utf8_general_ci'
                    },
                    tableOptions: {
                        engine: 'InnoDB',
                        defaultCharset: 'utf8'
                    }
                }
            }
        }, options);

        this.options.buildPath = path.resolve(this.options.buildPath);
    }

    modeling() {
        if (_.isEmpty(this.linker.schemas)) {
            throw new Error('No schema.');
        }
        
        let schemas = [];

        _.forOwn(this.linker.schemas, (schema, schemaName) => {
            _.forOwn(schema.deployments, (db) => {
                let options = Object.assign({}, this.options.db[db.type], db.options);

                let Modeler = require(`./db/${db.type}.js`);
                let modeler = new Modeler(this, options);

                this.linker.log('verbose', 'Modeling [' + db.type +  '] database structure for schema "' + schemaName + '"...');
                schemas.push(modeler.modeling(schema));
            });
        });
        
        return schemas;
    }

    buildFile(relativePath, content) {
        let p = path.resolve(this.options.buildPath, relativePath);

        fs.ensureFileSync(p);
        fs.writeFileSync(p, content);

        this.linker.log('info', 'Generated db script: ' + p);
    }
}

module.exports = DbModeler;