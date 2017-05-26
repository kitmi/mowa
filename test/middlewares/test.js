"use strict";

module.exports = (opt, webModule) => {

    return function* (next) {
        this.append('X-TEST-HEADER', 'For test only');
        yield next;
    };
};