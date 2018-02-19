"use strict";

const randomstring = require("randomstring");

exports.generate = async (info) => {
    console.log('Called auto generator: ' + JSON.stringify(info, null, 4));

    if (info.type == 'text') {
        if (info.fixedLength) {
            return randomstring.generate(info.fixedLength);
        }

        if (info.maxLength < 32) {
            return randomstring.generate(info.maxLength);
        }

        return randomstring.generate();
    }
};