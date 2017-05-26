"use strict";

module.exports = function (entity, fields) {
    if (!fields) {
        throw new Error('Invalid arguments');
    }

    Array.isArray(fields) || (fields = [ fields ]);

    entity.on('afterFields', () => {
        let fs = [];

        fields.forEach(f => {
            if (!entity.hasField(f)) {
                throw new Error('Required field "' + f + '" not exist.');
            }

            entity.setFieldInfo(f, { optional: true });
            fs.push(f);
        });

        entity.addValidationRule({
            name: 'atLeastOneNotNull',
            fields: fs
        });
    });
};