"use strict";

require('debug')('tracing')(__filename);

// Built-in libs
const URL = require('url');
const QS = require('querystring');
const _ = require('lodash');
const childProcess = require('child_process');
const path = require('path');

/**
 * A pure closure to be called to check the status under certain conditions
 * @callback module:Utilities.purePredicateFunction
 * @returns {boolean}
 */


/**
 * @module Utilities
 * @summary Collection of utilities.
 */

let U = module.exports = {

    //exports commonly-used utility class

    /**
     * A utility-belt library for JavaScript that provides support for the usual functional suspects (each, map, reduce, filter...) without extending any core JavaScript objects.
     * See {@link https://lodash.com}
     * @member {lodash}
     */
    _: _,

    /**
     * Contains methods that aren't included in the vanilla JavaScript string such as escaping html, decoding html entities, stripping tags, etc.
     * See {@link http://stringjs.com}
     * @member {String}
     */
    get S() { return require('string'); },

    /**
     * Methods that aren't included in the native fs module and adds promise support to the fs methods. It should be a drop in replacement for fs.
     * See {@link https://www.npmjs.com/package/fs-extra}
     * @member {FileSystem}
     */
    get fs() { return require('fs-extra'); },

    /**
     * Match files using the patterns the shell uses, like stars and stuff.
     * See {@link https://www.npmjs.com/package/glob}
     * @member {glob}
     */
    get glob() { return require('glob'); },

    /**
     * Use Express/Connect middleware with Koa.
     * See {@link https://www.npmjs.com/package/koa-connect}
     * @member {c2k}
     */
    get connect() { return require('koa-connect'); },

    /**
     * Generator based control flow goodness for nodejs and the browser, using promises, letting you write non-blocking code in a nice-ish way.
     * See {@link https://www.npmjs.com/package/co}
     * @member {co}
     */
    get co() { return require('co'); },

    /**
     * Higher-order functions and common patterns for asynchronous code.
     * See {@link http://caolan.github.io/async}
     * @member {async}
     */
    get async() { return require('async'); },    

    /**
     * A lightweight JavaScript date library for parsing, validating, manipulating, and formatting dates.
     * See {@link https://momentjs.com}
     * @member {moment}
     */
    get moment() { return require('moment'); },

    /**
     * Parse and display moments in any timezone.
     * See {@link https://momentjs.com/timezone}
     * @member {moment}
     */
    get timezone() { return require('moment-timezone'); },

    /**
     * Create a least recently used cache object.
     * @param {object} options
     * @returns {LRUCache}
     */
    createLRUCache(options) { var LRU = require("lru-cache"); return new LRU(options); },

    /**
     * Execute a shell command
     * @param {string} cmd - Command line to execute
     * @param cb - Callback
     * @returns {*|Array|{index: number, input: string}}
     */
    runCmd(cmd, cb) {
        const exec = childProcess.exec;

        return exec(cmd, function (error, stdout, stderr) {
            let output = { stdout, stderr };

            cb(error, output);
        });
    },

    /**
     * Execute a shell command synchronously
     * @param {string} cmd - Command line to execute
     * @returns {*|Array|{index: number, input: string}}
     */
    runCmdSync(cmd) {
        const exec = childProcess.execSync;
        return exec(cmd);
    },

    //exports utilities of this library

    /**
     * Load a js file in sand box.
     * @param {string} file - Source file
     * @param {object} variables - Variables as global
     * @param {object} deps = Dependencies
     */
    load: require('./util/loadInSandbox.js'),   

    // exports errors and constants of this library

    /**
     * Error class definitions.
     * @member {module:Errors}
     */
    get Error() { return require('./util/error.js'); },

    /**
     * Http status codes definitions.
     * @member {module:HttpCodes}
     */
    get HttpCode() { return require('./const/httpcode.js'); },

    /**
     * Common regexp patterns.
     * @member {module:Patterns}
     */
    get Pattern() { return require('./const/pattern.js'); },

    /**
     * Feature levels definitions.
     * @member {module:FeatureLevels}
     */
    get Feature() { return require('./const/feature.js'); },

    /**
     * Common constants.
     * @member {module:Literals}
     */
    get Literal() { return require('./const/literal.js'); },

    //yieldable iteration-----------

    /**
     * Wrap a generator to be a callback-style async function
     * @param gen
     * @param cb
     * @param args
     * @returns {*|Promise|Function|any}
     */
    coWrap: function (gen, cb, ...args) {
        return U.co.wrap(gen)(...args).then(result => cb(null, result)).catch(reason => cb(reason || new Error()));
    },

    /**
     * co-style async eachSeries
     * @param {array|object} coll - A collection to iterate over.
     * @param {generator} gen - A generator function to apply to each item in coll. iteratee*(item)
     */
    coEach: function* (coll, gen) {
        yield (done => U.async.eachSeries(
            coll,
            (item, cb) => U.coWrap(gen, cb, item),
            done
        ));
    },

    /**
     * co-style async eachOfSeries
     * @param {array|object} coll - A collection to iterate over.
     * @param {generator} gen - A generator function to apply to each item in coll. iteratee*(item, key)
     */
    coEachOf: function* (coll, gen) {
        yield (done => U.async.eachOfSeries(
            coll,
            (item, key, cb) => U.coWrap(gen, cb, item, key),
            done
        ));
    },

    /**
     * co-style event handler
     * @param {EventEmitter} emitter - The event emitter object to listen to
     * @param {string} event - The event
     * @param {generator} gen - A generator style event handler.
     */
    coListenOn: function* (emitter, event, gen) {
        yield (done => emitter.on(
            event,
            (data) => U.coWrap(gen, done, data)
        ));
    },

    /**
     * co-style "once" event handler
     * @param {EventEmitter} emitter - The event emitter object to listen to
     * @param {string} event - The event
     * @param {generator} gen - A generator style event handler.
     */
    coListenOnce: function* (emitter, event, gen) {
        yield (done => emitter.once(
            event,
            (data) => U.coWrap(gen, done, data)
        ));
    },

    //debug related-----------

    /**
     * To place a design-by-contract predication, skipped checking in production environment
     * @param {module:Utilities.purePredicateFunction} predicate
     * @param {text} principle
     */
    contract: function (predicate, principle) {
        if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') return;
        
        if (!predicate()) {
            throw new U.Error.BreakContractError(principle);
        }
    },
    
    //async related-----------

    /**
     * Run an array of promise factory sequentially.
     * @param arrayOfPromiseFactory
     * @returns {Promise}
     */
    eachPromise: function (arrayOfPromiseFactory) {
        var accumulator = [];
        var ready = Promise.resolve(null);

        arrayOfPromiseFactory.forEach(promiseFactory => {
            ready = ready.then(promiseFactory).then(value => {
                accumulator.push(value);
            });
        });

        return ready.then(() => accumulator);
    },    

    //url related-----------

    /**
     * Merge the query parameters into given url.
     * @param {string} url - Original url.
     * @param {object} query - Key-value pairs query object to be merged into the url.
     * @returns {string}
     */
    urlAppendQuery: function (url, query) {
        if (!query) return url;

        if (url.indexOf('?') === -1) {
            if (typeof query !== 'string') {
                return url + '?' + QS.stringify(query);
            }

            return url + '?' + query;
        }

        var urlObj = URL.parse(url, true);
        if (typeof query !== 'string') {
            delete urlObj.search;
            Object.assign(urlObj.query, query);
        } else {
            urlObj.search += '&' + query;
        }

        return URL.format(urlObj);
    },

    /**
     * Join url parts by adding necessary '/', query not supported, use urlAppendQuery instead.
     * @param {string} base - Left part
     * @param {array} parts - The rest of Url component parts
     * @returns {string}
     */
    urlJoin: function (base, ...parts) {
        base = U.trimRightSlash(base);

        if (!parts || parts.length === 0) {
            return base;
        }

        return base + U.ensureLeftSlash(parts.join('/'));
    },

    /**
     * Trim left '/' of a path.
     * @param {string} path - The path
     * @returns {string}
     */
    trimLeftSlash: function (path) {
        return U.S(path).chompLeft('/').s;
    },

    /**
     * Trim right '/' of a path.
     * @param {string} path - The path
     * @returns {string}
     */
    trimRightSlash: function (path) {
        return U.S(path).chompRight('/').s;
    },

    /**
     * Add a '/' to the left of a path if it does not have one.
     * @param {string} path - The path
     * @returns {string}
     */
    ensureLeftSlash: function (path) {
        return U.S(path).ensureLeft('/').s;
    },

    /**
     * Add a '/' to the right of a path if it does not have one.
     * @param {string} path - The path
     * @returns {string}
     */
    ensureRightSlash: function (path) {
        return U.S(path).ensureRight('/').s;
    },

    /**
     * Quote a string.
     * @param {string} str
     * @param {string} quoteChar
     * @returns {string}
     */
    quote: function (str, quoteChar = '"') {
        return quoteChar + str.replace(quoteChar, "\\" + quoteChar) + quoteChar;
    },

    /**
     * Bin to hex, like 0x7F
     * @param {binary} bin
     * @returns {string}
     */
    bin2Hex: function (bin) {
        bin = bin.toString();
        return '0x' + _.range(bin.length).map(i, bin.charCodeAt(i).toString(16)).join('');
    },

    //collection related-----------

    /**
     * Get a value by dot-separated path from a collection
     * @param {object} collection - The collection
     * @param {string} path - A dot-separated path (dsp), e.g. settings.xxx.yyy
     * @param {object} [defaultValue] - The default value if the path does not exist
     * @returns {*}
     */
    getValueByPath: function (collection, path, defaultValue) {
        var nodes = path.split('.'),
            value = collection;

        if (!value) {
            return defaultValue;
        }

        if (nodes.length === 0) return null;

        U._.find(nodes, function(e) {
            value = value[e];
            return typeof value === 'undefined';
        });

        return value || defaultValue;
    },

    /**
     * Set a value by dot-separated path from a collection
     * @param {object} collection - The collection
     * @param {string} path - A dot-separated path (dsp), e.g. settings.xxx.yyy
     * @param {object} value - The default value if the path does not exist
     * @returns {*}
     */
    setValueByPath: function (collection, path, value) {
        var nodes = path.split('.');
        var lastKey = nodes.pop();
        var lastNode = collection;

        U._.each(nodes, function(key) {
            if (key in collection) {
                lastNode = collection[key];
            } else {
                lastNode = collection[key] = {};
            }
        });

        lastNode[lastKey] = value;
    },

    /**
     * Push a non-array value into a bucket of a collection
     * @param {object} collection
     * @param {string} key
     * @param {object} value
     * @returns {*}
     */
    pushObjIntoBucket: function (collection, key, value) {
        U.contract(() => !_.isArray(value));

        let bucket = collection[key];
        
        if (!bucket) {
            bucket = collection[key] = value;
        } else if (_.isArray(bucket)) {
            bucket.push(value);
        } else {
            bucket = collection[key] = [ bucket, value ];
        }

        return bucket;
    },

    /**
     * Load environment-intelligence configuration
     * @param {string} basePath - Base directory path of the config files to be loaded
     * @param {string} baseName = Base file name of the config file
     * @param {string} env - Environment name
     * @param {object} locals - Values of local variables can be referenced in the config file
     * @returns {Promise}
     */
    loadEIConfig: function (basePath, baseName, env, locals) {
        if (!env) throw new Error('Argument "env" is required.');

        let pureBase = path.basename(baseName, '.js');

        let envFullPath = path.join(basePath, pureBase + '.' + env + '.js');
        let defFullPath = path.join(basePath, pureBase + '.default.js');

        let loadSpecificCfg = U.fs.existsSync(envFullPath) ?
            U.load(envFullPath, locals) :
            Promise.resolve({});

        let loadDefaultCfg = U.fs.existsSync(defFullPath) ?
            U.load(defFullPath, locals) :
            Promise.resolve({});

        let sCfg;

        return loadSpecificCfg.then(cfg => { sCfg = cfg; return loadDefaultCfg; }).then(cfg => _.defaults(sCfg, cfg));
    }
};