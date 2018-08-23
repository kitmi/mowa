"use strict";

const Util = require('../../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

const ComponentBase = require('../componentbase.js');

const config = {
    lts: true
};

class Docker extends ComponentBase {
    constructor(manager, session, instanceName, options) {
        super(manager, session, instanceName, options);
    }

    async doTest_() {
        let result = {};

        let ver = await this._ssh_('docker -v', false);

        if (ver.length > 0 && ver[0] === 'D') {
            result['installed'] = true;
        } else {
            return { installed: false, started: false }
        }

        let countText = await this._ssh_('ps -ef |grep node |grep -v "grep" |wc -l');
        result['started'] = parseInt(countText) > 0;
        return result;
    }

    async doInstall_() {
        let nvmInstall = 'nvm install ' + (this.options.lts ? '--lts node' : 'node');
        return this._ssh_(nvmInstall);
    }

    async doUninstall_() {
        let nvmUninstall = 'nvm uninstall ' + (this.options.lts ? '--lts node' : 'node');
        return this._ssh_(nvmUninstall);
    }

    async doStart_() {
    }

    async doStop_() {
    }
}

Docker.componentType = 'docker';
Docker.defaultInstanceName = 'dockerInstance';
Docker.defaultConfig = config;

module.exports = Docker;