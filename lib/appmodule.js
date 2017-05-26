"use strict";

require('debug')('tracing')(__filename);

const Util = require('./util.js');
const util = require('util');
const path = require('path');
const EventEmitter = require('events');
const koa = require('koa');
const mount = require('koa-mount');
const vhost = require('koa-vhost');

class AppModule extends EventEmitter {
    /**
     * An app module object.
     * @constructs AppModule
     * @extends EventEmitter
     * @param {AppModule} parent
     * @param {string} name - The name of the web module.
     * @param {string} route - The base route of the  web module.
     * @param {object} [options] - The web module's extra options defined in its parent's configuration.
     */
    constructor(parent, name, route, options) {
        super();

        /**
         * Parent module
         * @type {AppModule}
         * @public
         **/
        this.parent = parent;

        /**
         * Module options, e.g. modulesPath, etcPath, ...
         * @type {object}
         * @property {string} options.modulesPath - App modules path
         * @property {string} options.etcPath - Config files path
         * @property {string} options.backendPath - Backend files path
         * @property {string} options.frontendPath - Frontend files path
         * @property {string} options.modelsPath - Models files path, under backend folder
         * @property {string} options.middlewaresPath - Middleware files path
         * @property {string} options.featuresPath - Feature files path
         * @public
         **/
        this.options = Object.assign({
            modulesPath: Util.Literal.APP_MODULES_PATH,
            etcPath: Util.Literal.ETC_PATH,
            backendPath: Util.Literal.BACKEND_PATH,
            frontendPath: Util.Literal.FRONTEND_PATH,
            modelsPath: Util.Literal.MODELS_PATH,
            middlewaresPath: Util.Literal.MIDDLEWARES_PATH,
            featuresPath: Util.Literal.FEATURES_PATH
        }, options);

        /**
         * Module config, loading from config file
         * @type {object}
         * @public
         */
        this.config = {};

        /**
         * Name of the app
         * @type {object}
         * @public
         **/
        this.name = name || 'unnamed_app';

        /**
         * Loaded features, name => feature object
         * @type {Map}
         * @public
         */
        this.features = new Map();

        /**
         * Loaded services
         * @type {Map}
         * @public
         */
        this.services = new Map(); // services

        /**
         * Loaded middlewares
         * @type {Map}
         * @public
         */
        this.middlewares = new Map(); // middlewares

        /**
         * Environment mode
         * @type {string}
         * @public
         */
        this.env;

        /**
         * Absolute path of this app module
         * @type {string}
         * @public
         */
        this.absolutePath;

        /**
         * Mounting route of the app
         * @type {string}
         * @public
         */
        this.route;

        /**
         * Router object
         * @type {object}
         * @public
         */
        this.router;

        /**
         * Server module
         * @type {MowaServer}
         * @public
         */
        this.serverModule;

        /**
         * A friendly name of the app to be used in debugging info
         * @type {string}
         * @public
         */
        this.displayName;

        if (!parent) {
            this._etcPrefix = Util.Literal.SERVER_CFG_NAME;

            this.env = process.env.NODE_ENV || "development";
            this.absolutePath = process.cwd();
            this.route = '';

            this.router = koa();
            this.serverModule = this;
            this.displayName = `Server[${this.name}]`;
        } else {
            this._etcPrefix = Util.Literal.APP_CFG_NAME;

            this.env = parent.env;
            this.absolutePath = path.join(parent.modulesPath, name);

            if (Util._.isEmpty(route)) {
                throw new Error('Argument "route" is required.');
            }

            this.route = Util.ensureLeftSlash(Util.trimRightSlash(Util.urlJoin(parent.route, route)));

            this.router = koa();
            this.serverModule = parent.serverModule;
            this.displayName = this.name;

            if (this.parent == this.serverModule) {
                this.displayName = `App[${this.displayName}]`;
            } else {
                this.displayName = this.parent.displayName + ' > ' + this.displayName;
            }

            if (!Util.fs.existsSync(this.absolutePath)) {
                throw new Error(`App module [${this.name}] does not exist.`);
            }
        }

        /**
         * App modules path
         * @type {string}
         * @public
         **/
        this.modulesPath = this.toAbsolutePath(this.options.modulesPath);
        /**
         * Config files path
         * @type {string}
         * @public
         **/
        this.etcPath = this.toAbsolutePath(this.options.etcPath);
        /**
         * Backend files path
         * @type {string}
         * @public
         **/
        this.backendPath = this.toAbsolutePath(this.options.backendPath);
        /**
         * Frontend files path
         * @type {string}
         * @public
         **/
        this.frontendPath = this.toAbsolutePath(this.options.frontendPath);
        /**
         * Models files path, under backend folder
         * @type {string}
         * @public
         **/
        this.modelsPath = this.toAbsolutePath(this.options.modelsPath);
        /**
         * Middleware files path
         * @type {string}
         * @public
         **/
        this.middlewaresPath = this.toAbsolutePath(this.options.middlewaresPath);
        /**
         * Feature files path
         * @type {string}
         * @public
         **/
        this.featuresPath = this.toAbsolutePath(this.options.featuresPath);
    }

    /**
     * Get the hosting http server object of this app module
     * @member {object}
     */
    get hostingHttpServer() {
        return this.httpServer || this.parent.hostingHttpServer;
    }

    /**
     * Start the app module
     * @memberof AppModule
     * @param extraFeatures
     * @returns {Promise}
     */
    start(extraFeatures) {
        //load middlewares of the web module
        this.loadMiddlewareFiles(this.toAbsolutePath(this.options.backendPath, this.options.middlewaresPath));

        let globals = {
            '$name': this.name,
            '$serverPath': (p) => this.serverModule.toAbsolutePath(p),
            '$modulePath': (p) => this.toAbsolutePath(p),
            '$route': (p) => (p ? Util.urlJoin(this.route, p) : this.route),
            '$option': (node) => Util.getValueByPath(this.options, node),
            '$app': (node) => Util.getValueByPath(this.settings, node),
            '$server': (node) => Util.getValueByPath(this.serverModule.settings, node),
            '$now': Util.moment()
        };
        
        return Util.loadEIConfig(this.toAbsolutePath(this.options.etcPath), this._etcPrefix, this.env, globals).then(cfg => {
            this.config = cfg;

            if (!Util._.isEmpty(extraFeatures)) Util._.extend(this.config, extraFeatures);

            return this._loadFeatures().then(() => {
                if (this.options.logger) {
                    this.logger = this.getLoggerById(this.options.logger);

                    if (!this.logger) {
                        return Promise.reject('No logger');
                    }
                }

                return Promise.resolve(this);
            });
        });        
    }

    /**
     * Stop the app module
     * @memberof AppModule
     * @returns {*|Promise}
     */
    stop() {
        return Promise.resolve();
    }

    /**
     * Translate a relative path and query parameters if any to a url path
     * @memberof AppModule
     * @param {string} relativePath - Relative path
     * @param {*} [pathOrQuery] - Queries
     * @returns {string}
     */
    toWebPath(relativePath, ...pathOrQuery) {
        let url, query;

        if (pathOrQuery && pathOrQuery.length > 0) {
            if (Util._.isObject(pathOrQuery[pathOrQuery.length - 1])) {
                query = pathOrQuery.pop();
            }
            pathOrQuery.unshift(relativePath);
            url = Util.urlJoin(this.route, ...pathOrQuery);
        } else {
            url = Util.urlJoin(this.route, relativePath);
        }

        url = Util.ensureLeftSlash(url);
        if (query) {
            url = Util.urlAppendQuery(url, query);
            url = url.replace('/?', '?');
        }

        return url;
    }

    /**
     * Translate a relative path of this app module to an absolute path
     * @memberof AppModule
     * @param {*} relativePath - Relative path
     * @returns {string}
     */
    toAbsolutePath(relativePath) {
        if (arguments.length == 0) {
            return this.absolutePath;
        }

        let parts = Array.prototype.slice.call(arguments);
        parts.unshift(this.absolutePath);

        return path.resolve.apply(null, parts);
    }

    /**
     * Register a service
     * @memberof AppModule
     * @param {string} name
     * @param {object} serviceObject
     * @param {boolean} override
     */
    registerService(name, serviceObject, override) {
        if (name in this.services && !override) {
            throw new Util.Error.InternalError('Service "'+ name +'" already registered!');
        }

        this.services[name] = serviceObject;
    }

    /**
     * Get a service from module hierarchy
     * @memberof AppModule
     * @param name
     * @returns {object}
     */
    getService(name) {
        if (name in this.services) {
            return this.services[name];
        }

        if (this.parent) {
            return this.parent.getService(name);
        }

        return undefined;
    }

    /**
     * Get a model object by module id
     * @memberof AppModule
     * @param modelId
     * @returns {object}
     */
    getModel(modelId) {
        let partNodes = modelId.split('.');
        let modelPath = this.toAbsolutePath(this.options.backendPath, 'models', ...partNodes) + '.js';

        return require(modelPath);
    }

    /**
     * Load and regsiter middleware files from a specified path
     * @memberof AppModule
     * @param mwPath
     */
    loadMiddlewareFiles(mwPath) {
        let files = Util.glob.sync(path.join(mwPath, '*.js'), {nodir: true});
        files.forEach(file => this.registerMiddleware(path.basename(file, '.js'), require(file)));
    }

    /**
     * Register a middleware
     * @memberof AppModule
     * @param {string} name
     * @param {object} middleware
     */
    registerMiddleware(name, middleware) {
        if (name in this.middlewares) {
            throw new Util.Error.InternalError('Middleware "'+ name +'" already registered!');
        }

        this.middlewares[name] = middleware;
    }

    /**
     * Get a middlware from module hierarchy
     * @memberof AppModule
     * @param name
     * @returns {Function}
     */
    getMiddleware(name) {
        if (name in this.middlewares) {
            return this.middlewares[name];
        }

        if (this.parent) {
            return this.parent.getMiddleware(name);
        }

        return undefined;
    }

    /**
     * Use middlewares, skipped while the server running in deaf mode
     * @memberof AppModule
     * @param router
     * @param middlewares
     */
    useMiddlewares(router, middlewares) {
        if (this.serverModule.options.deaf) return;

        Util._.forOwn(middlewares, (options, name) => {
            let middleware = this.getMiddleware(name);

            if (typeof middleware !== 'function') {
                throw new Error('Unregistered middlware: ' + name);
            }

            //walk around the fix: https://github.com/alexmingoia/koa-router/issues/182
            if (router.register && middleware.__metaMatchMethods && middleware.__metaMatchMethods.length) {
                router.register('(.*)', middleware.__metaMatchMethods, middleware(options, self), {end: false});
            } else {
                router.use(middleware(options, this));
            }

            this.consoleVerbose(`Attached middleware [${name}].`);
        });
    }

    /**
     * Add a route to a router, skipped while the server running in deaf mode
     * @memberof AppModule
     * @param router
     * @param method
     * @param route
     * @param middlewares
     */
    addRoute(router, method, route, middlewares) {
        if (this.serverModule.options.deaf) return;

        let generators = [];

        Util._.forOwn(middlewares, (options, name) => {
            let middleware = this.getMiddleware(name);

            if (typeof middleware !== 'function') {
                throw new Error('Unregistered middlware: ' + name);
            }

            generators.push(middleware(options, this));

            this.consoleVerbose(`Middleware "${name}" is attached at "${method}:${this.route}${route}".`);
        });

        router[method](route, ...generators);

        this.consoleVerbose(`Route "${method}:${this.route}${route}" is added from module [${this.name}].`);
    }

    /**
     * Attach a router to this app module, skipped while the server running in deaf mode
     * @memberof AppModule
     * @param nestedRouter
     */
    addRouter(nestedRouter) {
        if (this.serverModule.options.deaf) return;

        this.router.use(nestedRouter.routes());
    }

    /**
     * Add a chile Module
     * @memberof AppModule
     * @param baseRoute
     * @param childModule
     */
    addChildModule(baseRoute, childModule) {
        this.childModules || (this.childModules = {});
        this.childModules[childModule.name] = childModule;

        if (this.serverModule.options.deaf || childModule.httpServer) return;

        if (childModule.options.host) {
            this.consoleVerbose(`Child module [${childModule.name}] is mounted at "${childModule.route}" with host pattern: "${childModule.options.host}".`);
            this.router.use(vhost(childModule.options.host, childModule.router));
        } else {
            this.consoleVerbose(`Child module [${childModule.name}] is mounted at "${childModule.route}".`);
            this.router.use(mount(baseRoute, childModule.router));
        }
    }

    /**
     * Get a logger by logger id, if not exist try get one from parent
     * @memberof AppModule
     * @param loggerId
     * @returns {Logger}
     */
    getLoggerById(loggerId) {
        let loggers, logger, owner = this;
        let rootLoggers = this.serverModule.getService('loggers');

        do {
            loggers = owner.getService('loggers');
            if (loggers) {
                logger = loggers.loggers[loggerId];
            }
            owner = this.parent;
        } while (!logger && owner && loggers != rootLoggers);


        if (!logger) {
            throw new Error(`Logger channel [${loggerId}] not found.`);
        }

        return logger;
    }

    /**
     * Write log
     * @memberof AppModule
     * @param {string} level - Log level, e.g., error, warn, info, verbose, debug
     * @param {string} message - Message
     * @param {*} [meta] - Any extra meta data
     */
    log(level, message, meta) {
        message = '[' + this.displayName + ']# ' + message;

        if (this.logger) {
            this.logger.log.call(this.logger, ...arguments);
        } else if (this.options.verbose || level <= 3) {
            console.log(level + ': ' + message + (meta ? ' Related: ' + JSON.stringify(meta, null, 4) : ''));
        }
    }

    /**
     * Print console message
     * @memberof AppModule
     * @param text
     */
    consoleVerbose(text) {
        if (this.options.verbose) {
            console.log('verbose: [' + this.displayName + ']# ' + text);
        }
    }

    /**
     * @memberof AppModule
     * @param item
     * @param msg
     * @param cfgFile
     */
    invalidConfig(item, msg, cfgFile) {
        throw new Util.Error.InvalidConfiguration(msg, cfgFile, item);
    }

    _loadFeatures() {
        let featureGroups = {
            [Util.Feature.INIT]: [],
            [Util.Feature.DBMS]: [],
            [Util.Feature.SERVICE]: [],
            [Util.Feature.ENGINE]: [],
            [Util.Feature.MIDDLEWARE]: [],
            [Util.Feature.ROUTING]: []
        };

        // load features
        Util._.forOwn(this.config, (block, name) => {
            let feature = this.features[name] || this._loadFeature(name);
            if (!(name in this.features)) {
                this.features[name] = feature;
            }            

            if (!feature.type) {
                throw new Error(`Missing feature type. Feature: ${name}`);
            }

            if (!(feature.type in featureGroups)) {
                throw new Error(`Invalid feature type. Feature: ${name}, type: ${feature.type}`);
            }

            featureGroups[feature.type].push(() => {
                this.consoleVerbose(`Loading feature: ${name} ...`);

                return feature.load(this, block);
            });
        });

        // execute features one by one
        let featureLevels = Object.keys(featureGroups);

        let result = Promise.resolve();

        featureLevels.forEach(level => {

            result = result.then(() => {
                this.emit('before:' + level);
                return Promise.resolve();
            });

            featureGroups[level].forEach(promiseFactory => {
                result = result.then(promiseFactory);
            });

            result = result.then(() => {
                this.emit('after:' + level);
                return Promise.resolve();
            });
        });

        return result;
    }

    _loadFeature(feature) {
        let extensionJs = this.toAbsolutePath(this.options.backendPath, this.options.featuresPath, feature + '.js');

        if (!Util.fs.existsSync(extensionJs)) {
            if (this.parent) {
                return this.parent._loadFeature(feature);
            } else {
                extensionJs = path.resolve(__dirname, 'features', feature + '.js');

                if (!Util.fs.existsSync(extensionJs)) {
                    throw new Error(`Feature "${feature}" not exist.`);
                }
            }
        }

        let featureObj = require(extensionJs);
        featureObj.name = feature;

        return featureObj;
    }
}

module.exports = AppModule;