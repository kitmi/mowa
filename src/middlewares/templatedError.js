"use strict";

/**
 * @module Middleware_TemplatedError
 * @summary Error response middleware with template engines
 */

const Mowa = require('../server.js');
 const path = require('path');

/**
 * @function
 * @param {Object} options - Template options
 * @property {string} options.template - Path to template written with your template engine
 * @property {string} options.engine - Path to template written with your template engine
 * @property {bool} options.cache - Path to template written with your template engine, default: NODE_ENV != 'development'
 * @property {string} [options.env='development'] - Path to template written with your template engine
 * @property {Array.<string>} options.accepts - Mimetypes passed to ctx.accepts, default: [ 'html', 'text', 'json' ]
 **/
const koaError = require('koa-error');

module.exports = (options, appModule) => {
    if (!options.template) {        
        if (options.engine && options.engine !== 'swig') {
            throw new Mowa.Error.InvalidConfiguration(
                'Missing template option.',
                appModule,
                'middlewares.templatedError.template'
            );        
        }

        options.template = 'defaultError.swig';
    }

    options.template = path.resolve(appModule.backendPath, Mowa.Literal.VIEWS_PATH, options.template); 

    if (!options.engine) {
        options.engine = 'swig';
    }

    return koaError(options);
} 