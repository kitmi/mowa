"use strict";

const Util = require('../../../util.js');
const _ = Util._;
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
function initialize(entity, fields) {
    if (!fields) {
        throw new Error('Missing field names!');
    }

    Array.isArray(fields) || (fields = [ fields ]);

    entity.addFeature({
        name: FEATURE_NAME,
        fields: fields
    }).on('afterFields', () => {
        fields.forEach(fieldName => {
            let field = entity.fields[fieldName];

            if (!field) {
                throw new Error('Required field "' + f + '" not exist.');
            }

            field.optional = true;
        });
    });
}

module.exports = initialize;