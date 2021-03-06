"use strict";

const Util = require('../../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

const ComponentBase = require('../componentbase.js');

const config = {
};

class Nvm extends ComponentBase {
    constructor(manager, session, instanceName, options) {
        super(manager, session, instanceName, options);
    }

    async doTest_() {
        let ver = await this._ssh_("command -v nvm", false);

        if (ver.length > 0 && ver === 'nvm') {
            return { installed: true, started: false };
        }

        return { installed: false, started: false };
    }

    async doInstall_() {
        await this._ssh_('curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash');
        return this._sshReconnect_();
    }

    async doUninstall_() {
        return this._ssh_("nvm unload");
    }

    async doStart_() {
    }

    async doStop_() {
    }
}

Nvm.componentType = 'nvm';
Nvm.defaultInstanceName = 'defaultInstance';
Nvm.defaultConfig = config;
Nvm.dependencies = [];

module.exports = Nvm;