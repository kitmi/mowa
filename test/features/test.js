"use strict";

const Util = require('../../lib/util.js');

module.exports = {

    type: Util.Feature.LEVEL_INIT,

    load: function (webModule, config) {

        webModule.on('before:' + Util.Feature.LEVEL_ENGINE, () => {
            console.log('do something before:' + Util.Feature.LEVEL_ENGINE);
        });

        webModule.on('after:' + Util.Feature.LEVEL_ENGINE, () => {
            console.log('do something after:' + Util.Feature.LEVEL_ENGINE);
        });

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log('test loaded.');
                webModule.test = true;

                resolve(config);
            }, 100);
        });
    }
};