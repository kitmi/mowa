"use strict";

const Util = require('../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

const ComponentBase = require('./componentbase.js');

class NpmGlobalComponent extends ComponentBase {
    constructor(manager, session, instanceName, options) {
        super(manager, session, instanceName, options);
    }

    async doTest_() {
        let result = {};

        let ver = await this._ssh_('npm ls -g ' + this.constructor.componentType + '|grep ' + this.constructor.componentType, false);

        if (ver.length > 0 && ver.indexOf('──') > -1) {
            return { installed: true, started: false }
        }

        return { installed: false, started: false };
    }

    async doInstall_() {
        return await this._ssh_('npm install -g ' + this.constructor.componentType);
    }

    async doUninstall_() {
        return await this._ssh_('npm uninstall -g ' + this.constructor.componentType);
    }

    async doStart_() {
    }

    async doStop_() {
    }
}

NpmGlobalComponent.defaultInstanceName = 'global';
NpmGlobalComponent.defaultConfig = {};
NpmGlobalComponent.dependencies = [ 'node' ];

module.exports = NpmGlobalComponent;