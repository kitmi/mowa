"use strict";

const Util = require('../../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

const ComponentBase = require('../componentbase.js');

const config = {
    lts: true
};

class Node extends ComponentBase {
    constructor(manager, session, instanceName, options) {
        super(manager, session, instanceName, options);
    }

    async doTest_() {
        let result = {};

        let ver = await this._ssh_("node -v", false);

        if (ver.length > 0 && ver[0] === 'v') {
            result['installed'] = true;
        } else {
            return { installed: false, started: false }
        }

        let countText = await this._ssh_('ps -ef |grep node |grep -v "grep" |wc -l');
        result['started'] = parseInt(countText) > 0;
        return result;
    }

    async doInstall_() {
        let nvmInstall = "nvm install " + (this.options.lts ? '--lts node' : 'node');
        return this._ssh_(nvmInstall);
    }

    async doUninstall_() {
        let nvmUninstall = "nvm uninstall " + (this.options.lts ? '--lts node' : 'node');
        return this._ssh_(nvmUninstall);
    }

    async doStart_() {
    }

    async doStop_() {
    }
}

Node.componentType = 'node';
Node.defaultInstanceName = 'defaultInstance';
Node.defaultConfig = config;
Node.dependencies = [ 'nvm' ];

module.exports = Node;