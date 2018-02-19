'use strict';const inflection=require('inflection');const Util=require('../../util.js');const _=Util._;const OolUtils=require('./ool-utils.js');class OolongField{constructor(name,rawInfo){if(!rawInfo){return}this.name=inflection.camelize(name,true);this.defaultName=this.name;this.type=rawInfo.type;if(rawInfo.validators){this.validators=rawInfo.validators}if(this.modifiers){this.modifiers=rawInfo.modifiers}if(this.type==='enum'){this.values=OolUtils.translateOolObj(rawInfo.values)}Object.assign(this,_.pick(rawInfo,['default','auto','digits','range','unsigned','totalDigits','decimalDigits','maxLength','fixedLength','untrim','readOnly','writeOnceOnly','optional','comment']))}clone(stack){if(!stack)stack=new Map;let cl=new OolongField;stack.set(this,cl);Object.assign(cl,this);OolUtils.deepCloneField(this,cl,'validators',stack);OolUtils.deepCloneField(this,cl,'modifiers',stack);OolUtils.deepCloneField(this,cl,'default',stack);OolUtils.deepCloneField(this,cl,'values',stack);return cl}toJSON(){return _.toPlainObject(this)}}module.exports=OolongField;