'use strict';const Util=require('../../../util.js');const _=Util._;const FEATURE_NAME='createTimestamp';function initialize(entity,options){let typeInfo={name:'createdAt',type:'datetime',auto:true,readOnly:true};if(options){if(typeof options==='string'){options={name:options}}Object.assign(typeInfo,options)}let fieldName=typeInfo.name;delete typeInfo.name;entity.addFeature({name:FEATURE_NAME,field:fieldName}).on('afterFields',()=>{entity.addField(fieldName,typeInfo)})}module.exports=initialize;