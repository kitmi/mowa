'use strict';const Util=require('../../../util.js');const _=Util._;const FEATURE_NAME='autoId';function initialize(entity,options){let typeInfo={name:'id',type:'int',auto:true,readOnly:true};if(options){if(typeof options==='string'){options={name:options}}Object.assign(typeInfo,options)}let fieldName=typeInfo.name;delete typeInfo.name;entity.addFeature({name:FEATURE_NAME,field:fieldName}).on('beforeFields',()=>{entity.addField(fieldName,typeInfo).setKey(fieldName)})}module.exports=initialize;