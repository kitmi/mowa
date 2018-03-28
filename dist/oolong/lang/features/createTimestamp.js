'use strict';const Util=require('../../../util.js'),_=Util._,FEATURE_NAME='createTimestamp';function initialize(entity,options){let typeInfo={name:'createdAt',type:'datetime',auto:true,readOnly:true,fixedValue:true};if(options){if('string'===typeof options){options={name:options}}Object.assign(typeInfo,options)}let fieldName=typeInfo.name;delete typeInfo.name;entity.addFeature(FEATURE_NAME,{field:fieldName}).on('afterFields',()=>{entity.addField(fieldName,typeInfo)})}module.exports=initialize;