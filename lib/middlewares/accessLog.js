"use strict";

require('debug')('tracing')(__filename);

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

module.exports = (opt, webModule) => {
    let format = opt.format || '{{ip}} [{{timestamp}}] "{{method}} {{url}} {{protocol}}/{{httpVersion}}" {{status}} {{size}} "{{referer}}" "{{userAgent}}" {{duration}} ms';

    if (!opt.logger) {
        webModule.invalidConfig('accessLog.logger', 'Missing logger id.');
    }

    let logger = webModule.getLoggerById(opt.logger);
    if (!logger) {
        throw new Error('Logger not found. Id: ' + opt.logger);
    }

    return function* (next) {
        let reader = new EnginePropsReader(this);

        yield next;

        let msg = Util.S(format).template(reader).s;
        logger.info(msg);
    };
};