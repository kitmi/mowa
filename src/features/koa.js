"use strict";

const Mowa = require('../server.js');
const Util = Mowa.Util;
const _ = Util._;
const Promise = Util.Promise;

/**
 * @module Feature_Koa
 * @summary Enable koa-based web engine in a mowa project
 */

module.exports = {

    /**
     * This feature is loaded at engine stage
     * @member {string}
     */
    type: Mowa.Feature.ENGINE,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {object} options - Options for the feature
     * @property {bool} [options.trustProxy] - When true proxy header fields will be trusted
     * @property {Array.<string>} [options.keys] - Set signed cookie keys
     * @property {int} [options.httpPort] - The http port number
     * @property {int} [options.subdomainOffset=2] - The offset of subdomains to ignore, default: 2
     * @returns {Promise.<*>}
     */
    load_: function (appModule, options) {
        let app = appModule.router;
        
        app.env = appModule.serverModule.env;
        app.proxy = Util.S(options.trustProxy).toBoolean();

        if (('subdomainOffset' in options) && options.subdomainOffset !== 2) {
            if (options.subdomainOffset < 2) {
                throw new Mowa.Error.InvalidConfiguration(
                    'Invalid subdomainOffset. Should be larger or equal to 2.',
                    appModule,
                    'koa.subdomainOffset'
                );
            }

            app.subdomainOffset = options.subdomainOffset;
        }

        if (options.keys) {
            if (!_.isArray(options.keys)) {
                app.keys = [ options.keys ];
            } else {
                app.keys = options.keys;
            }
        }

        app.on('error', (err, ctx) => {
            if (err.status && err.status < 500) {
                appModule.log('warn', `[${err.status}] ` + err.message, ctx && _.pick(ctx, ['method', 'url', 'ip']));
            } else {
                appModule.log('error', err.message, err.stack);
            }
        });

        let port = options.httpPort || 2331;

        if (!appModule.serverModule.options.deaf) {
            appModule.httpServer = require('http').createServer(app.callback());
            appModule.serverModule.addHttpServer(appModule, appModule.httpServer);

            appModule.on('after:' + Mowa.Feature.ROUTING, () => {
                appModule.httpServer.listen(port, function (err) {
                    if (err) throw err;

                    appModule.log('info', `A http service is listening on port [${this.address().port}] ...`);
                    appModule.emit('httpReady');
                });
            });
        }

        return Promise.resolve();
    }
};