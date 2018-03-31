'use strict';const path=require('path'),Mowa=require('../server.js'),Util=require('../util.js'),fs=Util.fs,_=Util._,S=Util.S,Linker=require('./lang/linker.js');function prepareLinkerContext(context,schemaFile){let oolongConfig=context.currentApp.config.oolong;if(!oolongConfig){return new Error('Missing oolong config in app module "'+context.currentApp.name+'".')}if(!oolongConfig.schemas){throw new Error('No schemas configured in oolong config.')}let linker=new Linker(context);linker.link(schemaFile);if(!linker.schema){throw new Error('No schema found in the linker.')}context.linker=linker;return oolongConfig}exports.build=function(context,schemaFile,restify){let oolongConfig=prepareLinkerContext(context,schemaFile),buildPath=path.join(context.currentApp.backendPath,Mowa.Literal.DB_SCRIPTS_PATH),schemaDeployments=[];if(!oolongConfig.schemas){throw new Error('Schemas config not found! Try run "mowa ooloon config" first.')}let schema=context.linker.schema,schemaName=schema.name;if(!(schemaName in oolongConfig.schemas)){throw new Error('Schema "'+schemaName+'" not exist in oolong config.')}let schemaOolongConfig=oolongConfig.schemas[schemaName],deployment=_.isArray(schemaOolongConfig.deployTo)?schemaOolongConfig.deployTo:[schemaOolongConfig.deployTo];_.each(deployment,dbServiceKey=>{let service=context.currentApp.getService(dbServiceKey),dbmsOptions=Object.assign({},service.dbmsSpec),DbModeler=require(`./modeler/db/${service.dbType}.js`),dbModeler=new DbModeler(context,dbmsOptions);schemaDeployments.push(dbModeler.modeling(schema,buildPath))});const DaoModeler=require('./modeler/dao.js');let daoModeler=new DaoModeler(context,path.resolve(context.currentApp.backendPath,Mowa.Literal.MODELS_PATH));_.each(schemaDeployments,schema=>{let schemaOolongConfig=oolongConfig.schemas[schema.name],deployment=_.isArray(schemaOolongConfig.deployTo)?schemaOolongConfig.deployTo:[schemaOolongConfig.deployTo];_.each(deployment,dbServiceKey=>{let service=context.currentApp.getService(dbServiceKey);daoModeler.modeling(schema,service)})});if(restify){const RestifyModeler=require('./modeler/restify.js');let restifyModeler=new RestifyModeler(context,path.resolve(context.currentApp.backendPath,Mowa.Literal.RESOURCES_PATH)),service=context.currentApp.getService(restify);restifyModeler.modeling(schema,service)}};exports.deploy=function(context,schemaFile,reset=false){let oolongConfig=prepareLinkerContext(context,schemaFile),promises=[],schema=context.linker.schema,schemaName=schema.name;if(!(schemaName in oolongConfig.schemas)){throw new Error('Schema "'+schemaName+'" not exist in oolong config.')}let schemaOolongConfig=oolongConfig.schemas[schemaName],deployment=_.isArray(schemaOolongConfig.deployTo)?schemaOolongConfig.deployTo:[schemaOolongConfig.deployTo];_.each(deployment,dbServiceKey=>{let service=context.currentApp.getService(dbServiceKey),Deployer=require(`./deployer/db/${service.dbType}.js`),deployer=new Deployer(context,service);promises.push(()=>deployer.deploy(reset))});return Util.eachPromise_(promises)};exports.import=async(context,db,dataSetDir)=>{let[dbType]=db.split(':'),dataListFile=path.join(dataSetDir,'index.list');if(!fs.existsSync(dataListFile)){return Promise.reject(`Data entry list file "${dataListFile}" not found.`)}let dataList=S(fs.readFileSync(dataListFile)).lines(),Deployer=require(`./deployer/db/${dbType}.js`),service=context.currentApp.getService(db),deployer=new Deployer(context,service);return Util.eachAsync_(dataList,async line=>{line=line.trim();if(0<line.length){let dataFile=path.join(dataSetDir,line);if(!fs.existsSync(dataFile)){return Promise.reject(`Data file "${dataFile}" not found.`)}await deployer.loadData(dataFile)}})};exports.reverse=async(context,db,extractedOolPath)=>{let service=context.currentApp.getService(db),dbmsOptions=Object.assign({},service.dbmsSpec),DbModeler=require(`./modeler/db/${service.dbType}.js`),dbModeler=new DbModeler(context,dbmsOptions);return dbModeler.extract(service,extractedOolPath)};exports.Linker=Linker;