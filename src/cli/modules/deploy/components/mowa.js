"use strict";

const Util = require('../../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

const ComponentBase = require('../componentbase.js');

const config = {
};

class Mowa extends ComponentBase {
    constructor(manager, session, instanceName, options) {
        super(manager, session, instanceName, options);
    }

    async doTest_() {
        let result = {};

        let ver = await this._ssh_('set -i && source ~/.bashrc && mowa -v', false);

        if (ver.length > 0 && ver[0] === 'v') {
            return { installed: true, started: false }
        }

        return { installed: false, started: false };
    }

    async doInstall_() {
        await this._ssh_('set -i && source ~/.bashrc && npm install mowa -g');
    }

    async doUninstall_() {
        await this._ssh_('set -i && source ~/.bashrc && npm uninstall mowa -g');
    }

    async doStart_() {
    }

    async doStop_() {
    }
}

Mowa.componentType = 'mowa';
Mowa.defaultInstanceName = 'globalInstall';
Mowa.defaultConfig = config;
Mowa.dependencies = [ 'node' ];

module.exports = Mowa;