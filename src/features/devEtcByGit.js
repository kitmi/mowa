"use strict";

/**
 * @module Feature_devEtcByGit
 * @summary Enable developer specific config identified by git user name
 */

const path = require('path');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const _ = Util._;
const fs = Util.fs;

const { JsonConfigProvider } = require('rk-config');
const AppModule = require('../appmodule.js');

const createDevConfigProvider = (devName) => {
    class DevConfigProvider extends JsonConfigProvider {
        constructor(configDir, baseName, envFlag, opts) {
            super(configDir, baseName, envFlag, opts);

            this._devName = devName;
        }

        /**
         * Start loading the config files
         * @returns {Promise}
         */
        async load() {
            let cfg = await super.load();
            let devCfgPath = path.join(this._configDir, this._baseName + '.' + this._devName + '.json');

            this.devConfig = await fs.pathExists(devCfgPath) ? await fs.readJson(devCfgPath) : {};

            return _.defaultsDeep({}, this.devConfig, cfg);
        }

        /**
         * Start saving the config to files
         * @returns {Promise}
         */
        async save() {
            await super.save();

            if (!_.isEmpty(this.devConfig)) {
                let devCfgPath = path.join(this._configDir, this._baseName + '.' + this._devName + '.json');

                await this._writeFile(devCfgPath, this.devConfig);
            }
        }
    }

    return DevConfigProvider;
};

module.exports = {

    /**
     * This feature is loaded at init stage
     * @member {string}
     */
    type: Mowa.Feature.INIT,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {object} options - Options for the feature
     * @property {string} [options.devNameFrom] - The developer name extracted from name or email
     * @returns {Promise.<*>}
     */
    load_: async (appModule, options) => {
        if (appModule !== appModule.serverModule) {
            throw new Mowa.Error.InvalidConfiguration(
                '"devEtcByGit" feature can only be enabled in server configuration.',
                appModule
            );
        }

        let devNameFrom = (options && options.devNameFrom) || 'name';
        let devName;

        if (devNameFrom === 'name') {
            devName = Util.runCmdSync('git config --global user.name').trim();
            if (devName === '') {
                throw new Error('Unable to read "user.name" of git config.');
            }

            devName = _.kebabCase(devName);
        } else if (devNameFrom !== 'email') {
            devName = Util.runCmdSync('git config --global user.email').trim();
            if (devName === '') {
                throw new Error('Unable to read "user.email" of git config.');
            }

            let i = devName.indexOf('@');
            if (i < 1) {
                throw new Error('Invalid "user.email" of git config.');
            }

            devName = devName.substr(0, i);
        } else {
            throw new Mowa.Error.InvalidConfiguration(
                '"devNameFrom" should be name or email.',
                appModule,
                'devEtcByGit.devNameFrom'
            );
        }

        AppModule.ConfigProvider = createDevConfigProvider(devName);
    }
};