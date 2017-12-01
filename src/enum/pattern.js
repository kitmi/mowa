"use strict";

/**
 * Common Regex patterns.
 * @readonly
 * @enum {RegExp}
 */

const Patterns = module.exports = {
    /**
     * Email
     */
    EMAIL: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

    /**
     * Chinese mobile
     */
    MOBILE_CN: /^((\+|00)86)?1\d{10}$/,

    /**
     * Australian mobile
     */
    MOBILE_AU: /^(((\+|00)61)|0)4\d{8}$/
};