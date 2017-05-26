"use strict";

require('debug')('tracing')(__filename);

let passportAuthenticate = (opt, webModule) => {
    if (!opt || !opt.strategy) {
        webModule.invalidConfig('passportAuthenticate.strategy', 'Missing "strategy" name for middleware "passportAuthenticate"');
    }
    
    let passport = webModule.getService('passport');
    
    return passport.authenticate(opt.strategy, opt.options);
};

passportAuthenticate.__metaMatchMethods = ['post'];

module.exports = passportAuthenticate;