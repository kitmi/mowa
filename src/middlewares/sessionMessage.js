"use strict";

/**
 * @module Middleware_SessionMessage
 * @summary Flash Messages Middleware
 */

const koaFlash = require('koa-flash-message');

/**
 add message to flash messages

 ctx.flashMessage.warning = 'Log Out Successfully!';

 read all flash messages

 ctx.state.flashMessage.messages
 // or ctx.flashMessage.messages

 read warning message

 ctx.state.flashMessage.warning
 */

module.exports = koaFlash;