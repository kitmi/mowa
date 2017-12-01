"use strict";

class DbDeployer {
    /**
     * Oolong database deployer
     * @constructs OolongDbDeployer
     * @param {object} context
     * @param {string} schemaName
     * @param {object} dbService
     */
    constructor(context, schemaName, dbService) {
        this.logger = context.logger;
        this.appModule = context.currentApp;
        this.schemaName = schemaName;
        this.dbService = dbService;
    }

    deploy(reset) {
        
    }

    loadData(dataFile, mode) {

    }
}

module.exports = DbDeployer;