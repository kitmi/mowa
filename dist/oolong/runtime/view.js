'use strict';const Mowa=require('../../server.js'),Util=Mowa.Util,_=Util._,Errors=require('./errors.js'),{ModelValidationError,ModelOperationError}=Errors,Generators=require('./generators.js'),Validators=require('./validators.js');let View=class View{constructor(){this.appModule=this.db.appModule}get db(){return this.constructor.db}get meta(){return this.constructor.meta}async load(params){return this._doLoad(params)}};module.exports=View;