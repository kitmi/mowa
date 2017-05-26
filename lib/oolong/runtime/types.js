"use strict";

const isInt = function (val) {
    return typeof val === "number" &&
        isFinite(val) &&
        Math.floor(val) === val;
};

const isFloat = function (val) {
    return typeof val === 'number' &&!isNaN(val);
};

const isPlainObject = function (value) {
    if (typeof value !== 'object' ||
        value.toString() != '[object Object]') {
        return false;
    }

    // If has modified constructor
    let ctor = value.constructor;
    if (typeof ctor !== 'function') return false;

    // If has modified prototype
    let prot = value.prototype;
    if (typeof prot !== 'object' ||
        prot.toString() != '[object Object]') {
        return false;
    }

    // If constructor does not have an Object-specific method
    if (prot.hasOwnProperty('isPrototypeOf') === false) {
        return false;
    }

    // Most likely a plain Object
    return true;
};

const DOUBLE_QUOTE = "\"";
const ESCAPED_DOUBLE_QUOTE = "\"\"";
const CHARACTERS_THAT_MUST_BE_QUOTED = /,|"|\n/;

const escapeCsv = function (s) {
    if (s.indexOf(DOUBLE_QUOTE) !== -1) {
        s = s.replace(DOUBLE_QUOTE, ESCAPED_DOUBLE_QUOTE);
    }

    if (s.search(CHARACTERS_THAT_MUST_BE_QUOTED) !== -1) {
        s = DOUBLE_QUOTE + s + DOUBLE_QUOTE;
    }

    return s;
};

const unescapeCsv = function (s) {
    if (s.startsWith(DOUBLE_QUOTE) && s.endsWith(DOUBLE_QUOTE)) {
        s = s.substr(1, s.Length - 2);

        if (s.indexOf(ESCAPED_DOUBLE_QUOTE) !== -1) {
            s = s.replace(ESCAPED_DOUBLE_QUOTE, DOUBLE_QUOTE);
        }
    }

    return s;
};

exports.isInt = isInt;
exports.isFloat = isFloat;
exports.isPlainObject = isPlainObject;

exports.TYPE_INT = 'int';
exports.TYPE_FLOAT = 'float';
exports.TYPE_BOOL = 'bool';
exports.TYPE_TEXT = 'text';
exports.TYPE_BINARY = 'binary';
exports.TYPE_DATETIME = 'datetime';
exports.TYPE_JSON = 'json';
exports.TYPE_XML = 'xml';
exports.TYPE_ENUM = 'enum';
exports.TYPE_CSV = 'csv';


