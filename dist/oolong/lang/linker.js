'use strict';const path=require('path'),Util=require('../../util.js'),co=Util.co,fs=Util.fs,_=Util._,glob=Util.glob,Schema=require('./schema.js'),Entity=require('./entity.js'),Oolong=require('./oolong.js'),OolUtil=require('./ool-utils.js'),OolongParser=Oolong.parser;let OolongLinker=class OolongLinker{constructor(context){this.logger=context.logger;this.currentAppModule=context.currentApp;this.schema=undefined;this._oolModules={};this._entityCache={};this._typeCache={}}log(level,message,data){if(data){this.logger.log(level,message,data)}else{this.logger.log(level,message)}}isModuleLoaded(modulePath){return modulePath in this._oolModules}getModule(modulePath){return this._oolModules[modulePath]}link(entryFileName){let entryFile=path.resolve(this.currentAppModule.oolongPath,`${entryFileName}`),entryModule=this.loadModule(entryFile);if(!entryModule){throw new Error(`Cannot resolve file "${entryFile}".`)}if(!entryModule.schema){throw new Error('No schema defined in entry file.')}if(entryModule.schema.name!==entryModule.name){throw new Error(`Schema "${entryModule.schema.name}" defined in "${entryFileName}" should be the same with filename.`)}this.schema=new Schema(this,entryModule);this.schema.link();this._addRelatedEntities();return this}loadModule(modulePath){modulePath=path.resolve(modulePath);if(this.isModuleLoaded(modulePath)){return this.getModule(modulePath)}if(!fs.existsSync(modulePath)){return undefined}let ool=this._compile(modulePath);return this._oolModules[modulePath]=ool}loadEntity(oolModule,entityName){let entityRefId=entityName+'@'+oolModule.id;if(entityRefId in this._entityCache){return this._entityCache[entityRefId]}let moduleName=undefined;if(OolUtil.isMemberAccess(entityName)){let n=entityName.split('.');moduleName=n[0];entityName=n[1]}let entityModule;this.log('debug','Loading entity: '+entityName);let index=_.findLastIndex(oolModule.namespace,ns=>{let modulePath;if(ns.endsWith('*')){if(moduleName){modulePath=path.join(ns.substr(0,-1),moduleName+'.ool')}else{return undefined}}else{modulePath=moduleName?path.join(ns,moduleName+'.ool'):ns+'.ool'}this.log('debug','Searching: '+modulePath);entityModule=this.loadModule(modulePath);return entityModule&&entityModule.entity&&entityName in entityModule.entity});if(-1===index){throw new Error(`Entity reference "${entityName}" in "${oolModule.id}" not found.`)}let entity=entityModule.entity[entityName];if(!(entity instanceof Entity)){entity=new Entity(this,entityName,entityModule,entity).link();entityModule.entity[entityName]=entity}this._entityCache[entityRefId]=entity;return entity}loadType(oolModule,typeName){let typeRefId=typeName+'@'+oolModule.id;if(typeRefId in this._typeCache){return this._typeCache[typeRefId]}let moduleName=undefined;if(OolUtil.isMemberAccess(typeName)){let n=typeName.split('.');moduleName=n[0];typeName=n[1]}let typeModule;this.log('debug','Loading type: '+typeName);let index=_.findLastIndex(oolModule.namespace,ns=>{let modulePath;if(ns.endsWith('*')){if(moduleName){modulePath=path.join(ns.substr(0,-1),moduleName+'.ool')}else{return undefined}}else{modulePath=moduleName?path.join(ns,moduleName+'.ool'):ns+'.ool'}this.log('debug','Searching: '+modulePath);typeModule=this.loadModule(modulePath);return typeModule&&typeModule.type&&typeName in typeModule.type});if(-1===index){throw new Error(`Type reference "${typeName}" in "${oolModule.id}" not found.`)}let result={oolModule:typeModule,name:typeName};this._typeCache[typeRefId]=result;return result}trackBackType(oolModule,info){if(Oolong.BUILTIN_TYPES.has(info.type)){return info}let baseType=this.loadType(oolModule,info.type),baseInfo=baseType.oolModule.type[baseType.name];if(!Oolong.BUILTIN_TYPES.has(baseInfo.type)){baseInfo=this.trackBackType(baseType.oolModule,baseInfo);baseType.oolModule.type[baseType.name]=baseInfo}let derivedInfo=Object.assign({},baseInfo,_.omit(info,'type'));if(!derivedInfo.subClass){derivedInfo.subClass=[]}derivedInfo.subClass.push(info.type);return derivedInfo}_compile(oolFile){this.log('debug','Compiling '+oolFile+' ...');let coreEntitiesPath=path.resolve(__dirname,'core','entities'),oolongEntitiesPath=path.join(coreEntitiesPath,'oolong'),isCoreEntity=_.startsWith(oolFile,coreEntitiesPath);oolFile=path.resolve(oolFile);let ool=OolongParser.parse(fs.readFileSync(oolFile,'utf8'));if(!ool){throw new Error('Error occurred while compiling.')}let namespace;if(!_.startsWith(oolFile,oolongEntitiesPath)){namespace=[oolongEntitiesPath]}else{namespace=[]}let currentPath=path.dirname(oolFile);function expandNs(namespaces,ns,recursive){if(ns.endsWith('.ool')){namespaces.push(ns.substr(0,ns.length-4));return}if(fs.existsSync(ns+'.ool')){namespaces.push(ns);return}if(fs.statSync(ns).isDirectory()){namespaces.push(path.join(ns,'*'));if(recursive){let files=fs.readdirSync(ns);files.forEach(f=>expandNs(namespaces,path.join(ns,f),true))}}}if(ool.namespace){ool.namespace.forEach(ns=>{let p;if(ns.endsWith('/*')){p=path.resolve(currentPath,ns.substr(0,ns.length-2));let files=fs.readdirSync(p);files.forEach(f=>expandNs(namespace,path.join(p,f),false))}else if(ns.endsWith('/**')){p=path.resolve(currentPath,ns.substr(0,ns.length-3));let files=fs.readdirSync(p);files.forEach(f=>expandNs(namespace,path.join(p,f),true))}else{expandNs(namespace,path.resolve(currentPath,ns))}})}let currentNamespace=path.join(currentPath,'*');if(-1==namespace.indexOf(currentNamespace)){namespace.push(currentNamespace)}let baseName=path.basename(oolFile,'.ool'),pathWithoutExt=path.join(currentPath,baseName);if(-1==namespace.indexOf(pathWithoutExt)){namespace.push(pathWithoutExt)}ool.id=isCoreEntity?path.relative(coreEntitiesPath,oolFile):'./'+path.relative(this.currentAppModule.oolongPath,oolFile);ool.namespace=namespace;ool.name=baseName;ool.path=currentPath;let jsFile=oolFile+'.json';fs.writeFileSync(jsFile,JSON.stringify(ool,null,4));return ool}_addRelatedEntities(){this.log('debug','Finding referenced entities ...');let nodes={},beReferenced={};const extractNodesByRelation=(ool,relationInfo,leftEntity,rightName,extraRelationOpt)=>{let rightEntity=this.loadEntity(ool,rightName),relation=Object.assign({},relationInfo,{left:leftEntity,right:rightEntity},extraRelationOpt),leftPayload={to:rightEntity.id,by:relation};if(!nodes[leftEntity.id]){nodes[leftEntity.id]=[leftPayload]}else{nodes[leftEntity.id].push(leftPayload)}if(!beReferenced[rightEntity.id]){beReferenced[rightEntity.id]=[leftEntity.id]}else{beReferenced[rightEntity.id].push(leftEntity.id)}return rightEntity};_.each(this._oolModules,ool=>{if(ool.relation){ool.relation.forEach(r=>{let leftEntity=this.loadEntity(ool,r.left);if(_.isObject(r.right)){if('chain'===r.type){_.each(r.right,(rightOpt,rightName)=>{leftEntity=extractNodesByRelation(ool,r,leftEntity,rightName,rightOpt)})}else if('multi'===r.type){_.each(r.right,rightName=>{extractNodesByRelation(ool,r,leftEntity,rightName,{multi:r.right})})}}else{extractNodesByRelation(ool,r,leftEntity,r.right)}})}});let pending=new Set,visited=new Set;Object.keys(this.schema.entityIdMap).forEach(id=>pending.add(id));while(0<pending.size){let expanding=pending;pending=new Set;expanding.forEach(id=>{if(visited.has(id))return;let connections=nodes[id];if(connections){connections.forEach(c=>{pending.add(c.to);this.schema.addRelation(c.by)})}visited.add(id)})}}};module.exports=OolongLinker;