"use strict";

const NpmGlobalComponent = require('../npmGlobalComponent.js');

class Mowa extends NpmGlobalComponent {
    async doTest_() {
        let result = {};

        let ver = await this._ssh_('mowa -v', false);

        if (ver.length > 0 && ver[0] === 'v') {
            return { installed: true, started: false }
        }

        return { installed: false, started: false };
    }
}

Mowa.componentType = 'mowa';

module.exports = Mowa;