'use strict';const path=require('path'),shell=require('shelljs'),Util=require('../../../util.js'),_=Util._,fs=Util.fs,glob=Util.glob,async=Util.async,oolong=require('../../../oolong'),Mowa=require('../../../server.js'),MowaHelper=require('../../mowa-helper.js'),dbTypes=require('./dbms.js');exports.moduleDesc='Provide commands to do database modeling.';exports.commandsDesc={'list':'List all database connections','enable':'Enable a kind of database support','add':'Add a database connection'};exports.help=function(api){let cmdOptions={};switch(api.command){case'list':break;case'add':cmdOptions['app']={desc:'The name of the app to operate',inquire:true,promptType:'list',required:true,choicesProvider:()=>Promise.resolve(MowaHelper.getAvailableAppNames(api))};cmdOptions['type']={desc:'The database type',promptMessage:'Please select the target database type:',inquire:true,promptType:'list',required:true,choicesProvider:()=>Object.keys(dbTypes)};cmdOptions['db']={desc:'The name of the database',promptMessage:'Please input the name of the database:',inquire:true,required:true,alias:['database']};cmdOptions['conn']={desc:'Specify the value of the connection string',alias:['c','connection'],inquire:true};break;case'enable':cmdOptions['app']={desc:'The name of the app to operate',promptMessage:'Please select the target app:',inquire:true,promptType:'list',required:true,choicesProvider:()=>Promise.resolve(MowaHelper.getAvailableAppNames(api))};cmdOptions['dbms']={desc:'The dbms type',promptMessage:'Please select the target dbms:',inquire:true,promptType:'list',required:true,choicesProvider:()=>Object.keys(dbTypes)};break;case'help':default:break;}return cmdOptions};exports.list=async api=>{api.log('verbose','exec => mowa db list');let result=MowaHelper.getDbConnectionList(api),serverDbs=result[0],allAppDbs=result[1],server=result[2];api.log('info','All server-wide database connections:\n'+JSON.stringify(serverDbs,null,4)+'\n');_.forOwn(allAppDbs,(appDbs,appName)=>{api.log('info','Database connections in app ['+appName+']:\n'+JSON.stringify(appDbs,null,4)+'\n')})};exports.enable=async api=>{api.log('verbose','exec => mowa db enable');let appModule=MowaHelper.getAppModuleToOperate(api),dbms=api.getOption('dbms');if(!dbTypes[dbms]){return Promise.reject(`Unknown dbms type: ${dbms}`)}let deps=MowaHelper.getAppModuleDependencies(appModule),pkgs=dbTypes[dbms];shell.cd(appModule.absolutePath);pkgs.forEach(p=>{if(!(p in deps)){let stdout=Util.runCmdSync(`npm i --save ${p}`);api.log('verbose',stdout)}});shell.cd(api.base);let templateFeature=path.join(__dirname,'template','mysql.template.js'),targetPath=appModule.toAbsolutePath(Mowa.Literal.FEATURES_PATH,'mysql.js');if(!fs.existsSync(targetPath)){fs.copySync(templateFeature,targetPath)}api.log('info','Enabled mysql feature.')};exports.add=async api=>{api.log('verbose','exec => mowa db add');let appModule=MowaHelper.getAppModuleToOperate(api);await exports.enable(api);let type=api.getOption('type'),dbName=api.getOption('db'),conn=api.getOption('conn')||'to be defined';return MowaHelper.writeConfigBlock_(appModule.configLoader,`${type}.${dbName}.connection`,conn)};