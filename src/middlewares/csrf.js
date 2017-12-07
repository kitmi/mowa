"use strict";

/**
 * @module Middleware_Csrf
 * @summary ETag middleware
 */

const koaCsrf = require('koa-csrf');

/**
 * {
  invalidSessionSecretMessage: 'Invalid session secret',
  invalidSessionSecretStatusCode: 403,
  invalidTokenMessage: 'Invalid CSRF token',
  invalidTokenStatusCode: 403,
  excludedMethods: [ 'GET', 'HEAD', 'OPTIONS' ],
  disableQuery: false
}
 */

module.exports = koaCsrf;