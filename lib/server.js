"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const util = require('util');
const Util = require('./util.js');
const AppModule = require('./appmodule.js');
const OolongRuntime = require('./oolong/runtime');
const pkg = require('../package.json');

const Commons = Util.Literal;

process.on('uncaughtException', e => {
    console.error('UncaughtException: ' + e.stack);
    process.exit(1);
});

class MowaServer extends AppModule {

    /**
      * A Mowa server instance
      * @constructs MowaServer
      * @extends AppModule
      * @param {string} [name='server'] - The name of the web module.
      * @param {object} [options] - The web module's extra options defined in its parent's configuration.
      */
    constructor(name, options) {
        if (typeof options === 'undefined') {
            if (typeof name === 'undefined') {
                name = 'server';
            } else if (util.isObject(name)) {
                options = name;
                name = 'server';
            }
        }
        
        if (options && options.oneAppMode && !options.etcPath) {
            options.etcPath = path.resolve(__dirname, '..', 'conf', 'oneAppMode');
        }

        super(null, name, null, options);

        /**
         * Array of HTTP server objects
         * @type {array}
         * @protected
         **/
        this._httpServers = [];
        /**
         * Array of HTTP server objects
         * @type {integer}
         * @protected
         **/
        this._pendingHttpServer = 0;
    }

    /**
     * Start the mowa server
     * @memberof MowaServer
     * @param extraFeatures
     * @returns {Promise}
     */
    start(extraFeatures) {
        this.emit('starting', this);

        this.log('info', `Starting mowa server v.${pkg.version} ...`);

        this.on('started', () => {
            this.log('info', 'The server is running.');
        });
        
        //register builtin middlewares
        this.loadMiddlewareFiles(path.resolve(__dirname, Commons.MIDDLEWARES_PATH));

        return super.start(extraFeatures).then(() => {
            if (this._pendingHttpServer > 0) {
                this.once('allHttpReady', () => {
                    this.emit('started', this);
                })
            } else {
                this.emit('started', this);
            }

            return Promise.resolve(this);
        }).catch(error => {
            if (this.env === 'development' && util.isError(error)) {
                console.error(error.stack);
            }

            this.log('error', 'Failed to start server!');

            process.exit(1);
        });
    }

    /**
     * Stop the mowa server
     * @memberof MowaServer
     * @returns {*|Promise}
     */
    stop() {
        this.emit('stopping', this);

        return super.stop().then(() => {
            let promises = this._httpServers.reverse().map(s => new Promise((resolve, reject) => {
                let port = s.address().port;
                s.close((err) => {
                    if (err) return reject(err);

                    this.log('info', `The http server listening on port [${port}] is stopped.`);
                    resolve();
                });
            }));

            return Promise.all(promises).then(() => {
                this._httpServers = [];
                this.emit('stopped', this);
            });
        });
    }

    /**
     * Add a HTTP server
     * @memberof MowaServer
     * @param {AppModule} appModule
     * @param {object} httpServer
     */
    addHttpServer(appModule, httpServer) {
        this._httpServers.push(httpServer);
        this._pendingHttpServer++;

        appModule.once('httpReady', () => {
            this._pendingHttpServer--;
            if (this._pendingHttpServer == 0) {
                this.emit('allHttpReady');
            }
        });
    }
}

/**
 * Utilities shortcut
 * @memberof MowaServer
 */
MowaServer.Util = Util;

/**
 * Ooloon runtime context
 * @memberof MowaServer
 */
MowaServer.OolongRuntime = OolongRuntime;

module.exports = MowaServer;