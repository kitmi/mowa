"use strict";const randomstring=require("randomstring");exports.generate=info=>{console.log("Called auto generator: "+JSON.stringify(info,null,4));if("text"==info.type){if(info.fixedLength){return randomstring.generate(info.fixedLength)}if(32>info.maxLength){return randomstring.generate(info.maxLength)}return randomstring.generate()}};