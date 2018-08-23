'use strict';const Util=require('../../util.js'),fs=Util.fs;let DbModeler=class DbModeler{constructor(context,dbmsOptions){this.logger=context.logger;this.linker=context.linker;this.dbmsOptions=dbmsOptions}modeling(dbService,schema,buildPath){this.logger.log('info','Modeling database structure for schema "'+schema.name+'" ...')}async extract(dbService,extractedOolPath){this.logger.log('info',`Extracting database structure from "${dbService.serviceId}" ...`)}_writeFile(filePath,content){fs.ensureFileSync(filePath);fs.writeFileSync(filePath,content);this.logger.log('info','Generated db script: '+filePath)}};module.exports=DbModeler;