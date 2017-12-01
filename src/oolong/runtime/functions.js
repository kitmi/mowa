"use strict";

exports.round = function (entity, instance, field, precision) {
    let value = instance.getFieldValue(field);
    let d = Math.pow(10, Math.abs(precision));
    if (precision > 0) {
        return Math.round(value/d)*d;
    }

    if (precision < 0) {
        return Math.round(value*d)/d;
    }

    return Math.round(value);
};

exports.removeInvalidCsvItem = function (entity, instance, field) {

};