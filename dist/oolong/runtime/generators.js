"use strict";const randomstring=require("randomstring"),Util=require("../../util");exports.generate=(appModule,info)=>{if("text"===info.type){if(info.fixedLength){return randomstring.generate(info.fixedLength)}if(32>info.maxLength){return randomstring.generate(info.maxLength)}return randomstring.generate()}else if("datetime"===info.type){return appModule.__&&appModule.__.datetime().toDate()||Util.moment().toDate()}};