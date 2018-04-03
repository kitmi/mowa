"use strict";

const inflection = require('inflection');
const Util = require('../../../util.js');
const _ = Util._;
const FEATURE_NAME = 'stateTracking';

/**
 * @module OolongEntityFeature_StateTracking
 * @summary A rule specifies the change of state will be tracked automatically
 */

/**
 * Initialize the feature
 * @param {OolongEntity} entity - Entity to apply this feature
 * @param {object} options - Tracking field options
 * @property {string} options.field - State field to track
 * @property {bool} [options.reversible=false] - Specify whether the field can be set to a previous state again
 */
function initialize(entity, options) {
    if (!options) {
        throw new Error('Missing field options!');
    }

    if (typeof options === 'string') {
        options = { field: options };
    }

    if (!options.field) {
        throw new Error('Missing field name in options!');
    }

    let stateSetTimestamp = {
        type: 'datetime',
        range: 'timestamp',
        readOnly: true,
        optional: true
    };

    if (!options.reversible) {
        stateSetTimestamp.fixedValue = true;
    }

    entity.addFeature(FEATURE_NAME, {
        field: options.field
    }, true).on('afterFields', () => {
        if (!entity.hasField(options.field)) {
            throw new Error('Field "' + options.field + '" does not exist!');
        }

        let fieldInfo = entity.fields[options.field];

        if (fieldInfo.type !== 'enum') {
            throw new Error('Only enum field can be used with stateTracking feature!');
        }

        fieldInfo.values.forEach(state => {
            let fieldName = options.field + _.upperFirst(_.camelCase(state)) + 'Timestamp';

            entity.addField(fieldName, stateSetTimestamp);
        });
    });

}

module.exports = initialize;