"use strict";

const Util = require('../../util.js');
const _ = Util._;

const Entity = require('./entity.js');
const Schema = require('./schema.js');
const Field = require('./field.js');

const deepClone = (value, stack) => {
    if (typeof value !== 'object') {
        return value;
    }

    if (stack && stack.has(value)) {
        return stack.get(value);
    } 

    let result;

    if (_.isArray(value)) {
        result = [];
        stack && stack.set(value, result);
        value.forEach(v => { result.push(deepClone(v, stack)); });
    } else if (_.isPlainObject(value)) {
        result = {};
        stack && stack.set(value, result);
        _.each(value, (v, k) => { result[k] = deepClone(v, stack); });
    } else {
        if ((value instanceof Entity.constructor) ||
            (value instanceof Schema.constructor) ||
            (value instanceof Field.constructor)
        ) {
            result = value.clone(stack);
            stack && stack.set(value, result);
        } else {
            result = _.clone(value);
            stack && stack.set(value, result);
        }
    }

    return result;
};

const deepCloneField = (src, dest, field, stack) => {
    if (src[field]) dest[field] = deepClone(src[field], stack);
};

const isMemberAccess = (name) => (name.indexOf('.') > 0);

const extractMemberAccess = (name) => name.split('.').map(n => n.trim());

const translateOolObj = oolObj => _.isPlainObject(oolObj)
    ? ((oolObj.type == 'Object' || oolObj.type == 'Array')
        ? translateOolObj(oolObj.value)
        : ((oolObj.type == 'Variable' || oolObj.type == 'ObjectReference')
            ? oolObj.name
            : _.reduce(oolObj, (result, v, k) => (result[k] = translateOolObj(v), result), {})))
    : (_.isArray(oolObj)
        ? _.map(oolObj, v => translateOolObj(v))
        : oolObj);

exports.deepClone = deepClone;
exports.deepCloneField = deepCloneField;
exports.isMemberAccess = isMemberAccess;
exports.extractMemberAccess = extractMemberAccess;
exports.translateOolObj = translateOolObj;
