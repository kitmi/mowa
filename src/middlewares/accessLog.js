"use strict";

/**
 * @module Middleware_AccessLog
 * @summary Add access log for every http request
 */

const Mowa = require('../server.js');
const Util = require('../util.js');

class EnginePropsReader {
    constructor(ctx) {
        this.ctx = ctx;
        this.startAt = Util.moment();
    }

    get ip() {
        return this.ctx.ip;
    }

    get method() {
        return this.ctx.method;
    }

    get url() {
        return this.ctx.url;
    }

    get status() {
        return this.ctx.status;
    }

    get httpVersion() {
        return this.ctx.req.httpVersion;
    }

    get protocol() {
        return this.ctx.protocol.toUpperCase();
    }

    get size() {
        return this.ctx.length || '-';
    }

    get referer() {
        return this.ctx.header['referer'] || '-';
    }

    get userAgent() {
        return this.ctx.header['user-agent'] || '-';
    }

    get timestamp() {
        return this.startAt.format();
    }

    get duration() {
        let endAt = Util.moment();
        return endAt.diff(this.startAt);
    }
}

module.exports = (opt, appModule) => {
    pre: opt, Util.Message.DBC_ARG_REQUIRED;
    
    let format = opt.format || '{{ip}} [{{timestamp}}] "{{method}} {{url}} {{protocol}}/{{httpVersion}}" {{status}} {{size}} "{{referer}}" "{{userAgent}}" {{duration}} ms';

    if (!opt.logger) {
        throw new Mowa.Error.InvalidConfiguration('Missing logger id.', appModule, 'middlewares.accessLog.logger');
    }

    let logger = appModule.getService('logger:' + opt.logger);
    if (!logger) {
        throw new Mowa.Error.InvalidConfiguration('Logger not found. Id: ' + opt.logger, appModule, 'middlewares.accessLog.logger');
    }

    return async (ctx, next) => {
        let reader = new EnginePropsReader(ctx);

        await next();

        let msg = Util.S(format).template(reader).s;
        logger.info(msg);
    };
};