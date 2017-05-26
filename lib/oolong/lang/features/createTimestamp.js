"use strict";

const FEATURE_NAME = 'createTimestamp';

module.exports = function (entity, options) {
    let typeInfo = Object.assign({
        type: 'datetime',
        range: 'timestamp',
        'default': { type: 'Pragma', value: 'db-generated-first' },
        readOnly: true
    }, options);
    
    let fieldName = 'createdAt';

    entity.on('afterFields', () => {
        entity.addField(fieldName, typeInfo)
            .addDbFeature({
                name: FEATURE_NAME,
                field: fieldName
            });
    });
};