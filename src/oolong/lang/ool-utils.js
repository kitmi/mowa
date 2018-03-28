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

const extractMemberAccess = (name) => name.split('.');

const getReferenceNameIfItIs = (obj) => {
    if (_.isPlainObject(obj) && obj.oolType === 'ObjectReference') {
        return extractMemberAccess(obj.name)[0];
    }

    return undefined;
};

exports.deepClone = deepClone;
exports.deepCloneField = deepCloneField;
exports.isMemberAccess = isMemberAccess;
exports.extractMemberAccess = extractMemberAccess;
exports.getReferenceNameIfItIs = getReferenceNameIfItIs;

exports.FUNCTOR_VARIABLE = 'variable';
exports.FUNCTOR_VALIDATOR = 'validator';
exports.FUNCTOR_MODIFIER = 'modifier';
exports.FUNCTOR_FUNCTION = 'function';