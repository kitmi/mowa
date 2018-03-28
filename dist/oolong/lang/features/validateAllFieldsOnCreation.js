"use strict";

const Util = require('../../../util.js');
const _ = Util._;
const FEATURE_NAME = 'validateAllFieldsOnCreation';

function initialize(entity) {
  entity.addFeature(FEATURE_NAME, true);
}

module.exports = initialize;