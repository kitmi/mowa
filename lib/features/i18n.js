"use strict";

require('debug')('tracing')(__filename);

const Util = require('../util.js');
const I18n = require('../i18n.js');

/**
 * 1. Register an i18n service
 * 2. Use i18n middleware before any other middleware
 * 3. Add requestedLocale at middleware context
 */

class I18nStorage {
    static get file() { return I18n.File; }
}

class I18nService {
    constructor(Handler, options) {
        this.HandlerClass = Handler;
        this.options = options;
        this.cache = Util.createLRUCache(5);
    }

    getI18n(locale) {
        const self = this;

        let i18nHandler = locale && this.cache.get(locale);

        if (!i18nHandler) {
            i18nHandler = new (this.HandlerClass)(this.options);

            if (!locale || !i18nHandler.isLocaleSupported(locale)) {
                locale = i18nHandler.defaultLocale;

                let defaultHandler = this.cache.get(locale);
                if (defaultHandler) {
                    return Promise.resolve(defaultHandler);
                }
            }

            return i18nHandler.setupAsync(locale).then(() => {
                self.cache.set(locale, i18nHandler);
                return Promise.resolve(i18nHandler);
            });
        }

        return Promise.resolve(i18nHandler);
    }
}

module.exports = {

    type: Util.Feature.SERVICE,

    load: function (webModule, config) {
        if (!config.store) {
            webModule.invalidConfig('i18n.store', 'Missing store type.');
        }

        let Storage = I18nStorage[config.store];

        if (!Storage) {
            webModule.invalidConfig('i18n.store', 'Unsupported store type.');
        }

        if (config.store === 'file') {
            config.options = Object.assign(config.options, {directory: webModule.toAbsolutePath(config.options.directory || 'locale')})
        }

        let service = new I18nService(Storage, config.options);

        let precedence = Util._.isEmpty(config.precedence) ? ['query', 'cookie', 'header'] : config.precedence;
        let queryKey = config.queryKey || 'locale';
        let cookieKey = config.cookieKey || 'locale';

        function* i18nMiddleware(next) {

            const self = this;
            let locale;
            let found = precedence.some(source => {

                switch (source) {
                    case 'query':
                        locale = self.query[queryKey];
                        break;

                    case 'cookie':
                        locale = self.cookies.get(cookieKey);
                        break;

                    case 'header':
                        let accept = self.acceptsLanguages() || '',
                            reg = /(^|,\s*)([a-z-]+)/gi,
                            match, l;

                        while ((match = reg.exec(accept))) {
                            if (!l) {
                                l = match[2];
                            }
                        }

                        locale = l;
                        break;

                    default:
                        webModule.invalidConfig('i18n.precedence', 'Unknown keyword: ' + source);                
                }

                return !Util._.isEmpty(locale);
            });

            if (found) this.requestedLocale = locale;

            this.__ = yield service.getI18n(this.requestedLocale);

            yield next;
        }

        webModule.registerService('i18n', service);
        webModule.router.use(i18nMiddleware);

        return Promise.resolve();
    }
};