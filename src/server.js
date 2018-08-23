"use strict";

const path = require('path');
const Util = require('./util.js');
const _ = Util._;
const Promise = Util.Promise;

const AppModule = require('./appmodule.js');
const pkg = require('../package.json');

const Literal = require('./enum/literal.js');

process.on('uncaughtException', e => {
    if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
        console.error('UncaughtException: ' + e.stack);
    } else {
        console.error('UncaughtException: ' + e.message || e.toString());
    }
    process.exit(1);
});

class MowaServer extends AppModule {

    /**
     * A Mowa server instance
     * @constructs MowaServer
     * @extends AppModule
     * @param {string} [name='server'] - The name of the web module.
     * @param {object} [options] - The web module's extra options defined in its parent's configuration.
     * @property {string} [options.logger] - The logger channel to be used as the default logger of server
     * @property {string} [options.modulePath] - The path of the server
     * @property {string} [options.childModulesPath='app_modules'] - Relative path of child modules
     * @property {string} [options.etcPath='etc'] - Relative path of configuration files
     * @property {string} [options.host] - Host of the server
     * @property {bool} [options.verbose=false] - Flag to output trivial information for diagnostics
     * @property {bool} [options.deaf=false] - Start the server without enabling the web engine, specially for cli
     * @property {bool} [options.logWithModuleName=false] - Flag to prepend module name before logging
     */
    constructor(name, options) {
        if (typeof options === 'undefined') {
            if (typeof name === 'undefined') {
                name = 'server';
            } else if (_.isPlainObject(name)) {
                options = name;
                name = 'server';
            }
        }
        
        if (options && options.oneAppMode && !options.etcPath) {
            options.etcPath = path.resolve(__dirname, '..', 'conf', 'oneAppMode');
        }

        super(null, name, null, options);

        this.env = MowaServer.env;

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
     * @returns {Promise.<MowaServer>}
     */
    start_(extraFeatures) {
        this.emit('starting', this);

        this.log('info', `Starting mowa server v.${pkg.version} ...`);

        let cwd = process.cwd();
        if (this.absolutePath !== cwd) {
            this._cwdBackup = cwd;
            process.chdir(this.absolutePath);
        }
        
        //register builtin middlewares
        this.loadMiddlewareFiles(path.resolve(__dirname, Literal.MIDDLEWARES_PATH));

        return super.start_(extraFeatures).then(() => {
            if (this._pendingHttpServer > 0) {
                this.once('allHttpReady', () => {
                    this.emit('started', this);
                })
            } else {
                this.emit('started', this);
            }

            return this;
        }).catch(error => {
            if (this.env === 'development' && _.isError(error)) {
                console.error(error.stack);
            }

            this.log('error', 'Failed to start server!');

            process.exit(1);
        });
    }

    /**
     * Stop the mowa server
     * @memberof MowaServer
     * @returns {Promise.<*>}
     */
    stop_() {
        this.emit('stopping', this);

        return super.stop_().then(() => {
            let promises = this._httpServers.reverse().map(s => new Promise((resolve, reject) => {
                let port = s.address().port;
                s.close((err) => {
                    if (err) return reject(err);

                    this.log('info', `The http server listening on port [${port}] is stopped.`);
                    resolve();
                });
            }));

            return Promise.all(promises).then(() => {
                if (this._cwdBackup) {
                    process.chdir(this._cwdBackup);
                }

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
 * Environment
 * @memberof MowaServer
 */
MowaServer.env = process.env.NODE_ENV || "development";

/**
 * AppModule class
 * @memberof MowaServer
 */
MowaServer.AppModule = AppModule;

/**
 * Utilities shortcut
 * @memberof MowaServer
 */
MowaServer.Util = Util;

/**
 * Error class definitions.
 * @memberof MowaServer
 */
MowaServer.Error = require('./error.js');

/**
 * Http status codes definitions.
 * @memberof MowaServer
 */
MowaServer.HttpCode = require('./enum/httpcode.js');

/**
* Common regexp patterns.
* @memberof MowaServer
*/
MowaServer.Pattern = require('./enum/pattern.js');

/**
* Feature levels definitions.
* @memberof MowaServer
*/
MowaServer.Feature = require('./enum/feature.js');

/**
* Common constants.
* @memberof MowaServer
*/
MowaServer.Literal = Literal;

module.exports = MowaServer;

/**
 * Middleware and action function
 * @callback KoaActionFunction
 * @async
 * @param {*} ctx - The koa request and response context. [See koajs about ctx details]{@link http://koajs.com/#context}
 * @param {KoaActionFunction} [next] - Next middleware or action.
 */
