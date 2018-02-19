"use strict";

const Util = require('../../util.js');
const _ = Util._;

const validator = require('validator');
const Types = require('./types.js');
const xml = require("tiny-xml");

const VALIDATORS_AND_MESSAGES = {
    'equals': 'equals', 
    'contains': 'contains', 
    'matches': 'matches',
    'isEmail': 'isEmail',
    'isURL': 'isURL',
    'isMACAddress': 'isMACAddress',
    'isIP': 'isIP',
    'isFQDN': 'isFDQN',
    'isBoolean': 'isBoolean',
    'isAlpha': 'isAlpha',
    'isAlphanumeric': 'isAlphanumeric',
    'isNumeric': 'isNumeric',
    'isLowercase': 'isLowercase',
    'isUppercase': 'isUppercase',
    'isAscii': 'isAscii',
    'isFullWidth': 'isFullWidth',
    'isHalfWidth': 'isHalfWidth',
    'isVariableWidth': 'isVariableWidth',
    'isMultibyte': 'isMultibyte',
    'isSurrogatePair': 'isSurrogatePair',
    'isInt': 'isInt',
    'isFloat': 'isFloat', 
    'isDecimal': 'isDecimal',
    'isHexadecimal': 'isHexadecimal',
    'isDivisibleBy': 'isDivisibleBy',
    'isHexColor': 'isHexColor',
    'isJSON': 'isJSON',
    'isNull': 'isNull',
    'isLength': 'isLength',
    'isByteLength': 'isByteLength',
    'isUUID': 'isUUID',
    'isMongoId': 'isMongoId',
    'isDate': 'isDate',
    'isAfter': 'isAfter',
    'isBefore': 'isBefore',
    'isIn': 'isIn',
    'isCreditCard': 'isCreditCard',
    'isISIN': 'isISIN',
    'isISBN': 'isISBN',
    'isMobilePhone': 'isMobilePhone',
    'isCurrency': 'isCurrency',
    'isISO8601': 'isISO8601',
    'isBase64': 'isBase64',
    'isDataURI': 'isDataURI'
};

const MOMENT_MESSAGES = [
    'Invalid year.',
    'Invalid month.',
    'Invalid day.',
    'Invalid hour.',
    'Invalid minute.',
    'Invalid second.',
    'Invalid millisecond.'
];

function processInt(ctx, meta, input) {
    let sanitized = input;

    if (!_.isInteger(sanitized)) {
        if (validator.isNumeric(sanitized)) {
            sanitized = parseInt(sanitized);
        } else {
            return { input, error: { field: meta, message: 'Invalid integer value.' } };
        }        
    }
    
    if ('max' in meta && sanitized > meta.max) {
        return { input, error: { field: meta, message: 'Exceeds the maximum value.' } };
    }
    
    if ('min' in meta && sanitized < meta.min) {
        return { input, error: { field: meta, message: 'Less than the minimum value.' } };
    }    

    return { input, sanitized };
}

function processFloat(ctx, meta, input) {
    let sanitized = input;

    if (!_.isNumber(sanitized)) {
        if (validator.isFloat(sanitized)) {
            sanitized = parseFloat(sanitized);
        } else {
            return { input, error: { field: meta, message: 'Invalid float number value.' } };
        }
    }

    if ('max' in meta && sanitized > meta.max) {
        return { input, error: { field: meta, message: 'Exceeds the maximum value.' } };
    }

    if ('min' in meta && sanitized < meta.min) {
        return { input, error: { field: meta, message: 'Less than the minimum value.' } };
    }
    
    if ('precision' in meta) {
        sanitized = parseFloat(sanitized.toFixed(meta.precision));
    }

    return { input, sanitized };
}

function processBool(ctx, meta, input) {
    let sanitized = input;

    if (typeof input !== 'boolean') {
        let i = ['true', '1' , 'yes', 'false', '0', 'no'].indexOf(input.toString().toLowerCase());
        if (i === -1) {
            return { input, error: { field: meta, message: 'Invalid boolean value.' } };
        }

        sanitized = i < 3;
    }

    return { input, sanitized };
}

function processText(ctx, meta, input) {
    let sanitized = (typeof input !== 'string') ? input.toString() : input;

    if (('fixedLength' in meta && sanitized.length > meta.fixedLength) ||
        ('max' in meta && sanitized.length > meta.max)) {
        return { input, error: { field: meta, message: 'Exceeds the maximum length.' } };
    }

    if ('min' in meta && sanitized.length < meta.min) {
        return { input, error: { field: meta, message: 'Does not meet the minimum length requirement.' } };
    }

    if (!meta.nonTrim) {
        sanitized = sanitized.trim();
    }

    return { input, sanitized };
}

function processBinary(ctx, meta, input) {
    let sanitized = (input instanceof Buffer) ? input : Buffer.from(input.toString());

    if (('fixedLength' in meta && sanitized.length > meta.fixedLength) ||
        ('max' in meta && sanitized.length > meta.max)) {
        return { input, error: { field: meta, message: 'Exceeds the maximum length.' } };
    }

    if ('min' in meta && sanitized.length < meta.min) {
        return { input, error: { field: meta, message: 'Does not meet the minimum length requirement.' } };
    }

    return { input, sanitized };
}

function processDatetime(ctx, meta, input) {
    let sanitized = input;

    if (!(sanitized instanceof Date)) {
        let m = ctx.appModule.__.datetime(sanitized);
        if (!m.isValid()) {
            let flag = m.invalidAt();
            if (flag < 0 || flag > 6) {
                return { input, error: { field: meta, message: 'Invalid datetime format.' } };
            }

            return { input, error: { field: meta, message: MOMENT_MESSAGES[flag] } };
        }

        sanitized = m.toDate();
    }

    return { input, sanitized };
}

function processJson(ctx, meta, input) {
    let sanitized = input;
    
    if (typeof sanitized === 'string') {
        sanitized = JSON.parse(sanitized);
    } else if (!_.isPlainObject(sanitized)) {
        if (ctx.appModule.env !== 'production') {
            sanitized = JSON.parse(JSON.stringify(sanitized));
        }
    }
    
    return { input, sanitized };
}

function processXml(ctx, meta, input) {
    let sanitized = input;

    let type = typeof sanitized;
    if (type !== 'string') {
        sanitized = xml.serialize(sanitized);
    } else if (!xml.valid(sanitized)) {
        return { input, error: { field: meta, message: 'Invalid XML snippet.' } };
    }

    return { input, sanitized };
}

function processEnum(ctx, meta, input) {
    let sanitized = input;

    if (typeof sanitized !== 'string' || meta.values.indexOf(sanitized) === -1) {
        return { input, error: { field: meta, message: 'Invalid enum value.' } };
    }

    return { input, sanitized };
}

function processCsv(ctx, meta, input) {
    let sanitized = input;

    // todo add escape
    if (typeof sanitized === 'string') {
        
    } else if (Array.isArray(sanitized)) {
        sanitized = sanitized.join(',');
    } else if (Types.isPlainObject(sanitized)) {
        // todo add a qualifier to sort keys
        sanitized = Object.values(sanitized).join(',');
    }

    return { input, sanitized };
}

exports.sanitizeAndValidate_ = async function (ctx, meta, value) {
    let result;

    switch (meta.type) {
        case Types.TYPE_INT:
            result = processInt(ctx, meta, value);
            break;
        case Types.TYPE_FLOAT:
            result = processFloat(ctx, meta, value);
            break;
        case Types.TYPE_BOOL:
            result = processBool(ctx, meta, value);
            break;
        case Types.TYPE_TEXT:
            result = processText(ctx, meta, value);
            break;
        case Types.TYPE_BINARY:
            result = processBinary(ctx, meta, value);
            break;
        case Types.TYPE_DATETIME:
            result = processDatetime(ctx, meta, value);
            break;
        case Types.TYPE_JSON:
            result = processJson(ctx, meta, value);
            break;
        case Types.TYPE_XML:
            result = processXml(ctx, meta, value);
            break;
        case Types.TYPE_ENUM:
            result = processEnum(ctx, meta, value);
            break;
        case Types.TYPE_CSV:
            result = processCsv(ctx, meta, value);
            break;
        default:
            throw new Error('Uknown field type: ' + meta.type);
    }

    if (result.error) {
        return result;
    }

    if (meta.validator) {
        Array.isArray(meta.validator) || (meta.validator = [meta.validator]);

        result = await Util.ifAnyPromise_(meta.validator.map(vtor => validator[vtor.name](value, vtor.args)), result => result.error);
    }

    return result;
};


