"use strict";

const Util = require('../../../util.js');

const FEATURE_NAME = 'stateTracking';

module.exports = function (entity, fields) {
    if (!fields) {
        throw new Error('Missing filed names!');
    }

    let opt = {
        reversible: false // if true means a status can be set to a previous state again
    };

    if (!Array.isArray(fields)) {
        if (Util._.isPlainObject(fields)) {
            if (fields.options) {
                opt = Object.assign(opt, fields.options);
                fields = [ fields.field ];
            }
        } else {
            fields = [ fields ];
        }
    }

    let stateSetTimestamp = {
        type: 'datetime',
        range: 'timestamp',
        optional: true
    };

    if (!opt.reversible) {
        stateSetTimestamp.writeOnceOnly = true;
    }

    entity.on('afterFields', () => {
        fields.forEach(field => {

            if (!entity.hasField(field)) {
                throw new Error('Field "' + field + '" does not exist!');
            }

            let fieldInfo = entity.fields[field];

            if (fieldInfo.type !== 'enum') {
                throw new Error('Only enum field can be used with stateTracking!');
            }

            fieldInfo.values.forEach(state => {
                let fieldName = state + 'Timestamp';

                entity.addField(fieldName, stateSetTimestamp);
            });
        });
    });

};