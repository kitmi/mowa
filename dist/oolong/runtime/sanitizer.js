"use strict";

const Util = require('../../util.js');
const _ = Util._;

const validator = require('validator');
const Types = require('./types.js');
const xml = require("tiny-xml");

function processText(meta, input) {
    let sanitized = typeof input !== 'string' ? input.toString() : input;

    if (!meta.nonTrim) {
        sanitized = sanitized.trim();
    }

    return { raw: input, sanitized };
}

function processBinary(meta, input) {
    let sanitized = input instanceof Buffer ? input : Buffer.from(input.toString());

    return { raw: input, sanitized };
}

function processDatetime(meta, input) {
    let sanitized = input;

    if (!(sanitized instanceof Date)) {
        sanitized = validator.toDate(sanitized);
    }

    return { raw: input, sanitized };
}

function processJson(meta, input) {
    let sanitized = input;

    if (typeof sanitized === 'string') {
        sanitized = sanitized.trim();
    } else {
        sanitized = JSON.stringify(sanitized);
    }

    return { raw: input, sanitized };
}

function processXml(meta, input) {
    let sanitized = input;

    if (typeof sanitized !== 'string') {
        sanitized = sanitized.trim();
    } else {
        sanitized = xml.serialize(sanitized);
    }

    return { raw: input, sanitized };
}

function processEnum(meta, input) {
    let sanitized = input;

    if (typeof sanitized === 'string') {
        sanitized = sanitized.trim();
    } else {
        sanitized = undefined;
    }

    return { raw: input, sanitized };
}

function processCsv(meta, input) {
    let sanitized = input;

    if (Array.isArray(sanitized)) {
        sanitized = sanitized.map(a => Types.escapeCsv(a)).join(',');
    } else if (_.isPlainObject(sanitized)) {
        sanitized = Object.values(sanitized).map(a => Types.escapeCsv(a)).join(',');
    } else {
        sanitized = undefined;
    }

    return { raw: input, sanitized };
}

exports.sanitize = async function (meta, value) {
    let result;

    switch (meta.type) {
        case Types.TYPE_INT:
            return { raw: value, sanitized: validator.toFloat(value) };

        case Types.TYPE_FLOAT:
            return { raw: value, sanitized: validator.toInt(value) };

        case Types.TYPE_BOOL:
            return { raw: value, sanitized: validator.toBoolean(value) };

        case Types.TYPE_TEXT:
            result = processText(meta, value);
            break;

        case Types.TYPE_BINARY:
            result = processBinary(meta, value);
            break;

        case Types.TYPE_DATETIME:
            result = processDatetime(meta, value);
            break;

        case Types.TYPE_JSON:
            result = processJson(meta, value);
            break;

        case Types.TYPE_XML:
            result = processXml(meta, value);
            break;

        case Types.TYPE_ENUM:
            result = processEnum(meta, value);
            break;

        case Types.TYPE_CSV:
            result = processCsv(meta, value);
            break;

        default:
            throw new Error('Unknown field type: ' + meta.type);
    }

    return result;
};