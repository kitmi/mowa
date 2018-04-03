"use strict";

const randomstring = require("randomstring");
const Util = require('../../util');

exports.generate = (appModule, info) => {
    if (info.type === 'text') {
        if (info.fixedLength) {
            return randomstring.generate(info.fixedLength);
        }

        if (info.maxLength < 32) {
            return randomstring.generate(info.maxLength);
        }

        return randomstring.generate();
    } else if (info.type === 'datetime') {
        return (appModule.__ && appModule.__.datetime().toDate()) || Util.moment().toDate();
    }
};