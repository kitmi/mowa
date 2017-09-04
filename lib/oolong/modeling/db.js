"use strict";

const path = require('path');
const Util = require('../../util.js');
const _ = Util._;
const fs = Util.fs;

class DbModeler {
    /**
     * Create appropriate db modeler to start modeling
     * @param {OolongLinker} linker
     * @param {object} options
     * @property {object} options.oolong
     * @property {object} options.oolong.schemas - The deployment information of schemas
     * @property {string} [options.buildPath='./build'] - Build path relative to the app module path
     * @returns {Array}
     */
    static startModeling(linker, options) {
        if (_.isEmpty(linker.schemas)) {
            throw new Error('No schema found in the linker.');
        }

        if (!options || !options.oolong) {
            throw new Error('Missing oolong config.');
        }

        options = Object.assign({
            buildPath: './build'
        }, options);

        options.buildPath = path.resolve(linker.currentAppModule.absolutePath, options.buildPath);

        let schemas = [];
        let oolongConfig = options.oolong;

        if (!oolongConfig.schemas) {
            throw new Error('No schemas configured in oolong confi/|kvf78897iun               u76gg.');
        }

        _.forOwn(linker.schemas, (schema, schemaName) => {
            if (!(schemaName in oolongConfig.schemas)) {
                throw new Error('Schema "' + schemaName + '" not exist in oolong config.');
            }

            let schemaOolongConfig = oolongConfig.schemas[schemaName];
            let deployment = _.isArray(schemaOolongConfig.deployTo) ? schemaOolongConfig.deployTo : [ schemaOolongConfig.deployTo ];

            _.each(deployment, (dbServiceKey) => {
                let service = linker.currentAppModule.getService(dbServiceKey);
                let dbmsOptions = Object.assign({}, service.dbmsSpec);

                let Modeler = require(`./db/${service.dbmsType}.js`);
                let modeler = new Modeler(linker, dbmsOptions);

                linker.log('verbose', 'Modeling [' + service.dbmsType +  '] database structure for schema "' + schemaName + '"...');
                schemas.push(modeler.modeling(schema, options.buildPath));
            });
        });

        return schemas;
    }

    /**
     * Oolong database modeler
     * @constructs OolongDbModeler
     * @param {OolongLinker} linker
     * @param {dbmsOptions} dbmsOptions
     */
    constructor(linker, dbmsOptions) {
        this.linker = linker;
        this.dbmsOptions = dbmsOptions;
    }

    /**
     * Modeling the schemas inside the linker and returns a list of modeled schemas
     * @returns {Array}
     */
    modeling(schema, buildPath) {
    }

    writeFile(filePath, content) {
        fs.ensureFileSync(filePath);
        fs.writeFileSync(filePath, content);

        this.linker.log('info', 'Generated db script: ' + filePath);
    }
}

module.exports = DbModeler;