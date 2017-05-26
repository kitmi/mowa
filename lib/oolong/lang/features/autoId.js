"use strict";

const _ = require('lodash');
const FEATURE_NAME = 'autoId';

module.exports = function (entity, opts) {
    let typeInfo = { type: 'int', 'default': { type: 'Pragma', value: 'db-generated-first' }, readOnly: true };

    if (opts) {        
        Object.assign(typeInfo, opts);
    }

    let fieldName = 'id';

    entity.on('beforeFields', () => 
        entity.addField(fieldName, typeInfo)
            .setKey(fieldName)
            .addDbFeature({
                name: FEATURE_NAME,
                field: fieldName
            })
    );
};