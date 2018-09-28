"use strict";

const Util = require('../../../util.js');
const _ = Util._;
const OolUtil = require('../ool-utils.js');

const FEATURE_NAME = 'atLeastOneNotNull';

/**
 * @module OolongEntityFeature_AtLeastOneNotNull
 * @summary A rule specifies at least one field not null, e.g. email or mobile
 */

/**
 * Initialize the feature
 * @param {OolongEntity} entity - Entity to apply this feature
 * @param {array} fields - List of field names
 */
function feature(entity, fields) {
    if (!fields) {
        throw new Error('Missing field names!');
    }

    Array.isArray(fields) || (fields = [ fields ]);

    entity.addFeature(FEATURE_NAME, fields, true).on('afterFields', () => {
        fields.forEach(fieldName => {
            let field = entity.fields[fieldName];

            if (!field) {
                throw new Error('Required field "' + fieldName + '" not exist.');
            }

            field.optional = true;
        });
    });
}

feature.__metaRules = {
    [OolUtil.RULE_POST_CREATE_CHECK]: [{
        test: (meta, featureSetting, context, db) => {
            return _.every(featureSetting, fieldName => _.isNil(context.latest[fieldName]));
        },
        apply: (meta, featureSetting, context, db) => {
            throw new ModelValidationError({
                fields: featureSetting.map(f => meta.fields[f]),
                message: 'At least one of these fields should not be null.'
            });
        }
    }],
    [OolUtil.RULE_POST_UPDATE_CHECK]: [{
        test: (meta, featureSetting, context, db) => {
            return _.every(featureSetting, fieldName => ((fieldName in context.latest) && _.isNil(context.latest[fieldName])) || (!(fieldName in context.latest) && _.isNil(context.existing[fieldName])));
        },
        apply: (meta, featureSetting, context, db) => {
            throw new ModelValidationError({
                fields: featureSetting.map(f => meta.fields[f]),
                message: 'At least one of these fields should not be null.'
            });
        }
    }]
};

module.exports = feature;