"use strict";

const path = require('path');

const Util = require('../util.js');
const Linker = require('./lang/linker.js');
const DbModeler = require('./modeling/db.js');
const DAOModeler = require('./modeling/dao.js');
const deploy = require('./deploy');
const importData = require('./deploy/import.js');

/**
 * @module Oolong
 * @summary Oolong DSL lib
 */

exports.deploy = deploy;

exports.import = importData;

/**
 * Build database scripts from oolong files
 * @param {object} context
 * @property {Logger} context.logger - Logger object
 * @property {AppModule} context.currentApp - Current app module
 * @param {string} schemaFilePath
 */
exports.build = function (context, schemaFilePath) {
    let linker = new Linker(context);
    linker.link(schemaFilePath);

    let scriptsOutputPath = path.join(context.currentApp.backendPath, Util.Literal.DB_SCRIPTS_PATH);
    let oolongConfig = context.currentApp.config.oolong;

    if (!oolongConfig) {
        return Promise.reject('Missing oolong config in app module "' + context.currentApp.name + '".');
    }

    let schemas = DbModeler.startModeling(linker, {oolong: oolongConfig,  buildPath: scriptsOutputPath});

    /*
    let daoModeler = new DAOModeler(linker, {buildPath: context.server.modelsPath});
    daoModeler.modeling(schemas);
    */

    return Promise.resolve();
};