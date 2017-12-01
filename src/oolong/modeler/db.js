"use strict";

const Util = require('../../util.js');
const fs = Util.fs;

class DbModeler {
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
        this.linker.log('info', 'Modeling database structure for schema "' + schema.name + '"...');
    }

    _writeFile(filePath, content) {
        fs.ensureFileSync(filePath);
        fs.writeFileSync(filePath, content);

        this.linker.log('info', 'Generated db script: ' + filePath);
    }
}

module.exports = DbModeler;