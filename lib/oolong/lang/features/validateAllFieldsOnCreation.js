"use strict";

const Util = require('../../../util.js');
const _ = Util._;
const FEATURE_NAME = 'validateAllFieldsOnCreation';

/**
 * @module OolongEntityFeature_UpdateTimestamp
 * @summary A rule specifies the change of state will be tracked automatically
 */

function initialize(entity) {
    entity.addFeature({ name: FEATURE_NAME });
}

module.exports = initialize;