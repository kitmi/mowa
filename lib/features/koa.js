"use strict";

require('debug')('tracing')(__filename);

const Util = require('../util.js');

module.exports = {

    type: Util.Feature.ENGINE,

    load: function (webModule, config) {        
        let app = webModule.router;
        
        app.env = webModule.env;
        app.name = config.name || webModule.name;
        app.proxy = Util.S(config.trustProxy).toBoolean();
        if (config.cookieSecretKeys) app.keys = config.cookieSecretKeys;

        app.on('error', (err, ctx) => {
            if (err.status && err.status < 500) {
                webModule.log('warn', `[${err.status}] ` + err.message, ctx && Util._.pick(ctx, ['method', 'url', 'ip']));
            } else {
                webModule.log('error', err.message, err.stack);
            }
        });

        if (!webModule.serverModule.options.deaf) {
            webModule.httpServer = require('http').createServer(app.callback());
            webModule.serverModule.addHttpServer(webModule, webModule.httpServer);

            webModule.on('after:' + Util.Feature.ROUTING, () => {
                let port = config.httpPort || 2331;

                webModule.httpServer.listen(port, function (err) {
                    if (err) throw err;

                    webModule.log('info', `A http service is listening on port [${this.address().port}] ...`);
                    webModule.emit('httpReady');
                });
            });
        }

        return Promise.resolve();
    }
};