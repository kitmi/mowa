"use strict";

const Util = require('./util.js');
const Promise = Util.Promise;
const _ = Util._;

const path = require('path');
const EventEmitter = require('events');
const Koa = require('koa');

const Feature = require('./enum/feature.js');
const Literal = require('./enum/literal.js');
const Error = require('./error.js');

const { Config, JsonConfigProvider } = require('rk-config');

const ConsoleLogLevel = new Set([ 'error', 'warn' ]);

class AppModule extends EventEmitter {
    /**
     * An app module object.
     * @constructs AppModule
     * @extends EventEmitter
     * @param {AppModule} parent
     * @param {string} name - The name of the web module.
     * @param {string} route - The base route of the  web module.
     * @param {object} [options] - The web module's extra options defined in its parent's configuration.
     * @property {string} [options.logger] - The logger channel to be used as the default logger of this app module
     * @property {string} [options.modulePath] - The path of this app module
     * @property {string} [options.childModulesPath='app_modules'] - Relative path of child modules
     * @property {string} [options.etcPath='etc'] - Relative path of configuration files
     * @property {string} [options.backendPath='server'] - Relative path of back-end server files
     * @property {string} [options.frontendPath='client'] - Relative path of front-end client source files
     * @property {string} [options.frontendStaticPath='public'] - Relative path of front-end static files
     * @property {bool} [options.npmModule=false] - Specify whether it's a npmModule
     * @property {bool} [options.verbose=false] - Flag to output trivial information for diagnostics
     * @property {string} [options.host] - Host of this app module
     */
    constructor(parent, name, route, options) {
        pre: name, Util.Message.DBC_ARG_REQUIRED;

        super();

        /**
         * Parent module
         * @type {AppModule}
         * @public
         **/
        this.parent = parent;

        /**
         * Module config, loading from config file
         * @type {object}
         * @public
         */
        this.config = undefined;

        /**
         * The config loader
         * @type {Config}
         * @public
         */
        this.configLoader = undefined;

        /**
         * Name of the app
         * @type {object}
         * @public
         **/
        this.name = name || 'unnamed_app';

        /**
         * Loaded features, name => feature object
         * @type {object}
         * @public
         */
        this.features = {};

        /**
         * Loaded services
         * @type {object}
         * @public
         */
        this.services = {};

        /**
         * Loaded middlewares
         * @type {object}
         * @public
         */
        this.middlewareFactoryRegistry = {};

        /**
         * Child modules
         * @type {object}
         * @public
         */
        this.childModules = undefined;

        if (!parent) {
            //server app
            this._etcPrefix = (options && options.etcPrefix) || Literal.SERVER_CFG_NAME;

            /**
             * Absolute path of this app module
             * @type {string}
             * @public
             */
            this.absolutePath = (options && options.modulePath) ? path.resolve(options.modulePath) : process.cwd();

            /**
             * Mounting route of the app
             * @type {string}
             * @public
             */
            this.route = '';

            /**
             * Server module
             * @type {MowaServer}
             * @public
             */
            this.serverModule = this;

            /**
             * A friendly name of the app to be used in debugging info
             * @type {string}
             * @public
             */
            this.displayName = `[${this.name}]`;
        } else {
            this._etcPrefix = Literal.APP_CFG_NAME;
            
            this.absolutePath = (options && options.modulePath) ? path.resolve(options.modulePath) : path.join(parent.absolutePath, parent.options.childModulesPath, name);

            if (_.isEmpty(route)) {
                throw new Error.ServerError('Argument "route" is required.');
            }

            this.route = Util.trimRightSlash(Util.urlJoin(parent.route, route));

            this.serverModule = parent.serverModule;
            this.displayName = this.parent.displayName + '->[' + this.name + ']';

            if (!Util.fs.existsSync(this.absolutePath)) {
                throw new Error.ServerError(`App module [${this.name}] does not exist.`);
            }
        }

        this.options = Object.assign({
            childModulesPath: Literal.APP_MODULES_PATH,
            etcPath: Literal.ETC_PATH
        }, options);

        /**
         * Backend files path
         * @type {string}
         * @public
         **/
        this.backendPath = this.toAbsolutePath(this.options.backendPath || Literal.BACKEND_PATH);
        /**
         * Frontend source files path
         * @type {string}
         * @public
         **/
        this.frontendPath = this.toAbsolutePath(this.options.frontendPath || Literal.FRONTEND_PATH);
        /**
         * Ooolong files path
         * @type {string}
         * @public
         */
        this.oolongPath = this.toAbsolutePath(Literal.OOLONG_PATH);
        /**
         * Frontend static files path, may be override by serveStatic middleware
         * @type {string}
         * @public
         **/
        this.frontendStaticPath = this.toAbsolutePath(this.options.frontendStaticPath || Literal.FRONTEND_STATIC_PATH);

        /**
         * Base router of the app
         * @type {Koa}
         * @public
         */
        this.router = new Koa();
    }

    /**
     * Get the hosting http server object of this app module
     * @member {object}
     */
    get hostingHttpServer() {        
        return this.httpServer || this.parent.hostingHttpServer;
    }

    /**
     * Get the koa instance of hosting http server of this app module
     * @member {object}
     */
    get hostingKoa() {        
        return this.httpServer ? this.router : this.parent.hostingKoa;
    }

    /**
     * Start the app module
     * @memberof AppModule
     * @param extraFeatures
     * @returns {Promise.<MowaServer>}
     */
    start_(extraFeatures) {
        //load middlewares of the web module
        this.loadMiddlewareFiles(this.toAbsolutePath(Literal.MIDDLEWARES_PATH));

        let configVariables = {
            'name': this.name,
            'serverPath': (p) => this.serverModule.toAbsolutePath(p),
            'modulePath': (p) => this.toAbsolutePath(p),
            'route': (p) => (p ? Util.urlJoin(this.route, p) : this.route),
            'option': (node) => Util.getValueByPath(this.options, node),
            'app': (node) => Util.getValueByPath(this.settings, node),
            'server': (node) => Util.getValueByPath(this.serverModule.settings, node),
            'now': Util.moment()
        };

        this.configLoader = new Config(new AppModule.ConfigProvider(this.toAbsolutePath(this.options.etcPath), this._etcPrefix, this.serverModule.env));
        return this.configLoader.load_(configVariables).then(cfg => {
            this.config = cfg;

            if (!_.isEmpty(extraFeatures)) _.extend(this.config, extraFeatures);

            this.emit('configLoaded');

            return this._loadFeatures_().then(() => {
                if (this.options.logger) {
                    this.logger = this.getService('logger:' + this.options.logger);

                    if (!this.logger) {
                        return Promise.reject('No logger');
                    }
                }

                if (this.options.verbose) {
                    let verboseMessage = 'Enabled features:\n' + Object.keys(this.features).join('\n') + '\n\n' +
                        'Registered services:\n' + Object.keys(this.services).join('\n') + '\n';

                    this.log('verbose', verboseMessage);
                }

                return Promise.resolve(this);
            });
        });        
    }

    /**
     * Stop the app module
     * @memberof AppModule
     * @returns {Promise.<*>}
     */
    stop_() {
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

        if (pathOrQuery && pathOrQuery.length > 0 && (pathOrQuery.length > 1 || pathOrQuery[0] !== undefined)) {
            if (_.isObject(pathOrQuery[pathOrQuery.length - 1])) {
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
            throw new Error.ServerError('Service "'+ name +'" already registered!');
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
     * Load and regsiter middleware files from a specified path
     * @memberof AppModule
     * @param mwPath
     */
    loadMiddlewareFiles(mwPath) {
        if (this.serverModule.options.deaf) return this;

        let files = Util.glob.sync(path.join(mwPath, '*.js'), {nodir: true});
        files.forEach(file => this.registerMiddlewareFactory(path.basename(file, '.js'), require(file)));
    }

    /**
     * Register the factory method of a named middleware
     * @memberof AppModule
     * @param {string} name - The name of the middleware 
     * @param {function} factoryMethod - The factory method of a middleware
     */
    registerMiddlewareFactory(name, factoryMethod) {
        pre: typeof factoryMethod === 'function', 'Invalid middleware factory: ' + name;

        if (name in this.middlewareFactoryRegistry) {
            throw new Error.ServerError('Middleware "'+ name +'" already registered!');
        }

        this.middlewareFactoryRegistry[name] = factoryMethod;
        this.log('verbose', `Registered named middleware [${name}].`);
    }

    /**
     * Get the factory method of a middleware from module hierarchy
     * @memberof AppModule
     * @param name
     * @returns {Function}
     */
    getMiddlewareFactory(name) {
        if (name in this.middlewareFactoryRegistry) {
            return this.middlewareFactoryRegistry[name];
        }

        if (this.parent) {
            return this.parent.getMiddlewareFactory(name);
        }

        throw new Error.ServerError('Unregistered middleware factory: ' + name);
    }

    /**
     * Use middlewares, skipped while the server running in deaf mode
     * @memberof AppModule
     * @param {Router} router
     * @param {*} middlewares - Can be an array of middleware entries or a key-value list of registerred middlewares
     */
    useMiddlewares(router, middlewares) {
        if (this.serverModule.options.deaf) return this;

        let middlewareFactory, middleware;
        let middlewareFunctions = [];
        
        if (_.isPlainObject(middlewares)) {
            _.forOwn(middlewares, (options, name) => {
                middlewareFactory = this.getMiddlewareFactory(name);   
                middleware = middlewareFactory(options, this);
                middlewareFunctions.push({ name, middleware });                
            });
        } else {
            middlewares = _.castArray(middlewares);          
        
            _.each(middlewares, middlewareEntry => {
                let type = typeof middlewareEntry;

                if (type === 'string') {
                    // [ 'namedMiddleware' ]
                    middlewareFactory = this.getMiddlewareFactory(middlewareEntry);
                    middleware = middlewareFactory(null, this);
                    middlewareFunctions.push({ name: middlewareEntry , middleware });
                } else if (type === 'function') {
                    middlewareFunctions.push({ name: middlewareEntry.name || 'unamed middleware', middleware: middlewareEntry});
                } else {
                    assert: _.isPlainObject(middlewareEntry) && 'name' in middlewareEntry, 'Invalid middleware entry';

                    middlewareFactory = this.getMiddlewareFactory(middlewareEntry.name);
                    middleware = middlewareFactory(middlewareEntry.options, this);
                    middlewareFunctions.push({ name: middlewareEntry.name, middleware });
                }
            });
        } 
        
        middlewareFunctions.forEach(({ name, middleware }) => {            
            if (Array.isArray(middleware)) {
                middleware.forEach(m => this._useMiddleware(router, m));
            } else {
                this._useMiddleware(router, middleware);
            }

            this.log('verbose', `Attached middleware [${name}].`);
        });        

        return this;
    }

    /**
     * Add a route to a router, skipped while the server running in deaf mode
     * @memberof AppModule
     * @param router
     * @param method
     * @param route
     * @param actions
     */
    addRoute(router, method, route, actions) {
        if (this.serverModule.options.deaf) return this;

        let handlers = [], middlewareFactory;

        if (_.isPlainObject(actions)) {
            _.forOwn(actions, (options, name) => {
                middlewareFactory = this.getMiddlewareFactory(name);
                handlers.push(middlewareFactory(options, this));
            });
        } else {
            actions = _.castArray(actions);

            _.each(actions, action => {
                let type = typeof action;
                if (type === 'string') {
                    // [ 'namedMiddleware' ]
                    middlewareFactory = this.getMiddlewareFactory(action);                    
                    handlers.push(middlewareFactory(null, this));
                } else if (type === 'function') {
                    handlers.push(action);
                } else {
                    assert: _.isPlainObject(action) && 'name' in action, 'Invalid middleware entry';

                    middlewareFactory = this.getMiddlewareFactory(action.name);                    
                    handlers.push(middlewareFactory(action.options, this));
                }
            })
        }

        router[method](route, ...handlers);

        let endpoint = Util.urlJoin(this.route, route);

        this.log('verbose', `Route "${method}:${endpoint}" is added from module [${this.name}].`);

        return this;
    }

    /**
     * Attach a router to this app module, skipped while the server running in deaf mode
     * @memberof AppModule
     * @param nestedRouter
     */
    addRouter(nestedRouter) {
        if (this.serverModule.options.deaf) return this;

        this.router.use(nestedRouter.routes());
        return this;
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

        if (this.serverModule.options.deaf || childModule.httpServer) return this;

        if (childModule.options.host) {
            this.log('verbose', `Child module [${childModule.name}] is mounted at "${childModule.route}" with host pattern: "${childModule.options.host}".`);

            const vhost = require('koa-virtual-host');
            this.router.use(vhost(childModule.options.host, childModule.router));
        } else {
            this.log('verbose', `Child module [${childModule.name}] is mounted at "${childModule.route}".`);

            const mount = require('koa-mount');
            this.router.use(mount(baseRoute, childModule.router));
        }

        return this;
    }    

    /**
     * Default log method, will be override by loggers feature
     * @memberof AppModule
     * @param {string} level - Log level, e.g., error, warn, info, verbose, debug
     * @param {string} message - Log message
     * @param {*} [meta] - Any extra meta data
     */
    log(level, message, meta) {
        message = this.formatLogMessage(message);

        if (this.logger) {
            if (meta) {
                this.logger.log(level, message, meta);
            } else {
                this.logger.log(level, message);
            }
        } else if (this.options.verbose || ConsoleLogLevel.has(level)) {
            console.log(level + ': ' + message + (meta ? ' Related: ' + JSON.stringify(meta, null, 4) : ''));
        }
    }

    /**
     * Format log message
     * @param {string} message - Log message
     * @returns {string}
     */
    formatLogMessage(message) {
        if (this.serverModule.options.logWithModuleName) {
            return this.displayName + '# ' + message;
        }

        return message;
    }

    /**
     * Prepare context for koa action
     * @param {Object} ctx - Koa request context
     * @param {function} action - Action function
     * @return {function}
     */
    wrapAction(action) {
        return async (ctx, next) => {
            ctx.appModule = this;

            Object.assign(ctx.state, {
                _self: ctx.originalUrl || this.toWebPath(ctx.url),
                __: ctx.__,
                _makePath: (relativePath, query) => this.toWebPath(relativePath, query),
                _makeUrl: (relativePath, query) => (ctx.origin + this.toWebPath(relativePath, query))            
            });

            if (ctx.csrf) {            
                ctx.state._csrf = ctx.csrf;
            }

            await action(ctx);

            return next();
        };        
    }

    _loadFeatures_() {
        let featureGroups = {
            [Feature.CONF]: [],
            [Feature.INIT]: [],
            [Feature.DBMS]: [],
            [Feature.SERVICE]: [],
            [Feature.ENGINE]: [],
            [Feature.MIDDLEWARE]: [],
            [Feature.ROUTING]: []
        };

        // load features
        _.forOwn(this.config, (block, name) => {
            let feature = this.features[name] || this._loadFeature(name);
            if (!(name in this.features)) {
                this.features[name] = feature;
            }

            if (feature) {
                if (!feature.type) {
                    throw new Error.ServerError(`Missing feature type. Feature: ${name}`);
                }

                if (!(feature.type in featureGroups)) {
                    throw new Error.ServerError(`Invalid feature type. Feature: ${name}, type: ${feature.type}`);
                }

                featureGroups[feature.type].push(() => {
                    this.log('verbose', `Loading feature: ${name} ...`);
                    return feature.load_(this, block);
                });
            }
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
        let extensionJs = this.toAbsolutePath(Literal.FEATURES_PATH, feature + '.js');

        if (!Util.fs.existsSync(extensionJs)) {
            if (this.parent) {
                return this.parent._loadFeature(feature);
            } else {
                //built-in features
                extensionJs = path.resolve(__dirname, 'features', feature + '.js');

                if (!Util.fs.existsSync(extensionJs)) {
                    if (this.serverModule.options.deaf) {
                        this.log('warning', `Feature "${feature}" not exist.`);
                        return undefined;
                    } else {
                        throw new Error.ServerError(`Feature "${feature}" not exist.`);
                    }                    
                }
            }
        } 

        try {
            let featureObj = require(extensionJs);
            featureObj.name = feature;

            return featureObj;
        } catch (error) {
            this.log('error', error.message);
            return undefined;
        }
    }

    _pushMiddleware(coll, name, middleware) {
        coll.push({ name, middleware });
    }

    _useMiddleware(router, middleware) {
        if (router.register && middleware.__metaMatchMethods && middleware.__metaMatchMethods.length) {
            router.register('(.*)', middleware.__metaMatchMethods, middleware, {end: false});
        } else {
            router.use(middleware);
        }
    }
}

AppModule.ConfigProvider = JsonConfigProvider; 

module.exports = AppModule;