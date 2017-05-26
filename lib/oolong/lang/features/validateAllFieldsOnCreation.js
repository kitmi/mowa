"use strict";

const FEATURE_NAME = 'validateAllFieldsOnCreation';

module.exports = function (entity) {
    entity.setModelingFlag(FEATURE_NAME);
};