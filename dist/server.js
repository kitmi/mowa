'use strict';const path=require('path');const Util=require('./util.js');const _=Util._;const Promise=Util.Promise;const AppModule=require('./appmodule.js');const OolongRuntime=require('./oolong/runtime');const pkg=require('../package.json');const Literal=require('./enum/literal.js');process.on('uncaughtException',e=>{console.error('UncaughtException: '+e.stack);process.exit(1)});class MowaServer extends AppModule{constructor(name,options){if(typeof options==='undefined'){if(typeof name==='undefined'){name='server'}else if(_.isPlainObject(name)){options=name;name='server'}}if(options&&options.oneAppMode&&!options.etcPath){options.etcPath=path.resolve(__dirname,'..','conf','oneAppMode')}super(null,name,null,options);this._httpServers=[];this._pendingHttpServer=0}start_(extraFeatures){this.emit('starting',this);this.log('info',`Starting mowa server v.${pkg.version} ...`);let cwd=process.cwd();if(this.absolutePath!==cwd){this._cwdBackup=cwd;process.chdir(this.absolutePath)}this.loadMiddlewareFiles(path.resolve(__dirname,Literal.MIDDLEWARES_PATH));return super.start_(extraFeatures).then(()=>{if(this._pendingHttpServer>0){this.once('allHttpReady',()=>{this.emit('started',this)})}else{this.emit('started',this)}return this}).catch(error=>{if(this.env==='development'&&_.isError(error)){console.error(error.stack)}this.log('error','Failed to start server!');process.exit(1)})}stop_(){this.emit('stopping',this);return super.stop_().then(()=>{let promises=this._httpServers.reverse().map(s=>new Promise((resolve,reject)=>{let port=s.address().port;s.close(err=>{if(err)return reject(err);this.log('info',`The http server listening on port [${port}] is stopped.`);resolve()})}));return Promise.all(promises).then(()=>{if(this._cwdBackup){process.chdir(this._cwdBackup)}this._httpServers=[];this.emit('stopped',this)})})}addHttpServer(appModule,httpServer){this._httpServers.push(httpServer);this._pendingHttpServer++;appModule.once('httpReady',()=>{this._pendingHttpServer--;if(this._pendingHttpServer==0){this.emit('allHttpReady')}})}}MowaServer.Util=Util;MowaServer.Error=require('./error.js');MowaServer.HttpCode=require('./enum/httpcode.js');MowaServer.Pattern=require('./enum/pattern.js');MowaServer.Feature=require('./enum/feature.js');MowaServer.Literal=Literal;MowaServer.OolongRuntime=OolongRuntime;MowaServer.DbService=require('./dbservice.js');module.exports=MowaServer;