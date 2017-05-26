"use strict";

require('debug')('tracing')(__filename);

const Util = require('../util.js');
const session = require('koa-generic-session');

module.exports = (opt, webModule) => {

    let store = opt.store || '';

    if (!store.type) {
        webModule.invalidConfig('session.store.type', 'Missing session store type.');
    }

    let storeGenerator;

    switch (store.type) {
        case 'redis':
            storeGenerator = require('koa-redis');
            break;
        case 'mysql':
            storeGenerator = require('koa-mysql-session');
            break;
        case 'mongodb':
            storeGenerator = require('koa-generic-session-mongo');
            break;
        case 'pgsql':
            storeGenerator = require('koa-pg-session');
            break;
        case 'rethinkdb':
            storeGenerator = require('koa-pg-session');
            break;
        case 'memory':
            storeGenerator = () => { return new (session.MemoryStore)(); };
            break;
        default:
            webModule.invalidConfig('session.store.type', 'Unsupported session store type.');
    }

    let sessionOptions = Object.assign({}, opt, {store: storeGenerator(store.options)});

    return session(sessionOptions);
};