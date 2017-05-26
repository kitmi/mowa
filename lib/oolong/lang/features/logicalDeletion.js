"use strict";

const FEATURE_NAME = 'logicalDeletion';

module.exports = function (entity, options) {
    let typeInfo = Object.assign({
        type: 'bool',
        'default': false,
        readOnly: true
    }, options);

    let fieldName = 'isDeleted';

    entity.on('afterFields', () => {
        entity.addField(fieldName, typeInfo)
            .addDbFeature({
                name: FEATURE_NAME,
                field: fieldName
            });
    });
};