"use strict";

const NpmGlobalComponent = require('../npmGlobalComponent.js');

class Pm2 extends NpmGlobalComponent {
    async doTest_() {
        let result = {};

        let ver = await this._ssh_('pm2 -v', false);

        if (ver.length > 0 && ver.indexOf('.') > 0) {
            return { installed: true, started: false }
        }

        return { installed: false, started: false };
    }
}

Pm2.componentType = 'pm2';

module.exports = Pm2;