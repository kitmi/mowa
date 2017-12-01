"use strict";

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

const validateInt = function (info, value) {
    if (!Types.isInt(value)) {
        if (validator.isNumeric(value)) {
            value = parseInt(value);
        } else {
            return { error: 'Not an integer.' };
        }        
    }
    
    if ('max' in info && value > info.max) {
        return { error: 'Exceed max limit.' };
    }
    
    if ('min' in info && value < info.min) {
        return { error: 'Under min limit.' }
    }    

    return { sanitized: value };
};

const validateFloat = function (info, value) {
    if (!Types.isFloat(value)) {
        if (validator.isFloat(value)) {
            value = parseFloat(value);
        } else {
            return { error: 'Not a float number.' };
        }
    }

    if ('max' in info && value > info.max) {
        return { error: 'Exceed max limit.' };
    }

    if ('min' in info && value < info.min) {
        return { error: 'Under min limit.' }
    }
    
    if ('precision' in info) {
        value = parseFloat(value.toFixed(info.precision));
    }

    return { sanitized: value };
};

const validateBool = function (info, value) {
    if (typeof value !== 'boolean') {
        let i = ['true', '1', 'false', '0'].indexOf(value.toString().toLowerCase());
        if (i === -1) {
            return { error: 'Not a boolean value.' };
        }
        
        value = i < 2;
    }

    return { sanitized: value };
};

const validateText = function (info, value) {
    if (typeof value !== 'string') {
        value = value.toString();
    }
    
    if (('fixedLength' in info && value.length > info.fixedLength) ||
        ('max' in info && value.length > info.max)) {
        return { error: 'Exceed max length.' };
    }  
    
    if ('min' in info && value.length < info.min) {
        return { error: 'Text too short.' };
    }

    if (!info.nonTrim) {
        value = value.trim();
    }    

    return { sanitized: value };
};

const validateBinary = function (info, value) {
    if (!(value instanceof Buffer)) {
        value = Buffer.from(value.toString());
    }

    if (('fixedLength' in info && value.length > info.fixedLength) ||
        ('max' in info && value.length > info.max)) {
        return { error: 'Exceed max length.' };
    }

    if ('min' in info && value.length < info.min) {
        return { error: 'Text too short.' };
    }

    return { sanitized: value };
};

const validateDatetime = function (info, value) {
    if (!(value instanceof Date)) {
        let m = this.__.datetime(value);
        if (!m.isValid()) {
            let flag = m.invalidAt();
            if (flag < 0 || flag > 6) {
                return { error: 'Invalid datetime format.' };
            }

            return { error: MOMENT_MESSAGES[flag] };
        }

        value = m.toDate();
    }

    return { sanitized: value };
};

const validateJson = function (info, value) {
    return { sanitized: typeof value === 'string' ? value : JSON.stringify(value) };
};

const validateXml = function (info, value) {
    let type = typeof value;
    if (type !== 'string') {
        value = xml.serialize(value);
    } else if (!xml.valid(value)) {
        return { error: 'Not a valid XML document.' };
    }

    return { sanitized: value };
};

const validateEnum = function (info, value) {
    if (typeof value !== 'string' || info.values.indexOf(value) === -1) {
        return { error: 'Invalid enum value.' };
    }

    return { sanitized: value };
};

const validateCsv = function (info, value) {
    // todo add escape
    if (typeof value === 'string') {
        
    } else if (Array.isArray(value)) {
        value = value.join(',');
    } else if (Types.isPlainObject(value)) {
        // todo add a qualifier to sort keys
        value = Object.values(value).join(',');
    }

    return { sanitized: value };
};

exports.validateAndSanitize = function* (fieldInfo, fieldValue) {
    let result;

    switch (fieldInfo.type) {
        case Types.TYPE_INT:
            result = validateInt(fieldInfo, fieldValue);
            break;
        case Types.TYPE_FLOAT:
            result = validateFloat(fieldInfo, fieldValue);
            break;
        case Types.TYPE_BOOL:
            result = validateBool(fieldInfo, fieldValue);
            break;
        case Types.TYPE_TEXT:
            result = validateText(fieldInfo, fieldValue);
            break;
        case Types.TYPE_BINARY:
            result = validateBinary(fieldInfo, fieldValue);
            break;
        case Types.TYPE_DATETIME:
            result = validateDatetime(fieldInfo, fieldValue);
            break;
        case Types.TYPE_JSON:
            result = validateJson(fieldInfo, fieldValue);
            break;
        case Types.TYPE_XML:
            result = validateXml(fieldInfo, fieldValue);
            break;
        case Types.TYPE_ENUM:
            result = validateEnum(fieldInfo, fieldValue);
            break;
        case Types.TYPE_CSV:
            result = validateCsv(fieldInfo, fieldValue);
            break;
    }

    if (fieldInfo.validator) {
        Array.isArray(fieldInfo.validator) || (fieldInfo.validator = [fieldInfo.validator]);

        let found = fieldInfo.validator.find(vtor => !(typeof vtor === 'object' ? validator[vtor.name](value, vtor.args) : validator[vtor](value)));
        if (found !== undefined) {
            return { error: VALIDATORS_AND_MESSAGES[typeof found === 'object' ? found.name : found] }
        }
    }

    return result;
};


