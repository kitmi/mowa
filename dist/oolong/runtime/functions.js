"use strict";exports.round=function(entity,instance,field,precision){let value=instance.getFieldValue(field),d=Math.pow(10,Math.abs(precision));if(0<precision){return Math.round(value/d)*d}if(0>precision){return Math.round(value*d)/d}return Math.round(value)};exports.removeInvalidCsvItem=function(entity,instance,field){};