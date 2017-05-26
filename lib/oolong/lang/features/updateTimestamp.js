"use strict";

const FEATURE_NAME = 'updateTimestamp';

module.exports = function (entity, options) {
    let typeInfo = Object.assign({
        type: 'datetime',
        range: 'timestamp',
        updateDefault: { type: 'Pragma', value: 'db-generated-first' },
        readOnly: true,
        optional: true
    }, options);

    let fieldName = 'updatedAt';

    entity.on('afterFields', () => {
        entity.addField(fieldName, typeInfo)
            .addDbFeature({
                name: FEATURE_NAME,
                field: fieldName
            });
    });
};