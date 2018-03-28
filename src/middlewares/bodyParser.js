"use strict";

/**
 * @module Middleware_BodyParser
 * @summary Http request body parser middleware
 */

const koaBetterBody = require('koa-better-body');
const convert = require('koa-convert');

module.exports = options => convert(koaBetterBody(options));