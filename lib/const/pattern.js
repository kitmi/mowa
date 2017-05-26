"use strict";

require('debug')('tracing')(__filename);

/**
 * @module Patterns
 * @summary Common Regex patterns.
 */

module.exports = {
    /**
     * Email
     * @member
     */
    EMAIL: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

    /**
     * Chinese mobile
     * @member
     */
    MOBILE_CN: /^((\+|00)86)?1\d{10}$/,

    /**
     * Australian mobile
     * @member
     */
    MOBILE_AU: /^(((\+|00)61)|0)4\d{8}$/
};