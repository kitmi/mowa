'use strict';const Util=require('./util.js');const Promise=Util.Promise;const _=Util._;const path=require('path');const EventEmitter=require('events');const Koa=require('koa');const Feature=require('./enum/feature.js');const Literal=require('./enum/literal.js');const Error=require('./error.js');const{Config,JsonConfigProvider}=require('rk-config');class AppModule extends EventEmitter{constructor(parent,name,route,options){super();this.parent=parent;this.config=undefined;this.name=name||'unnamed_app';this.features={};this.services={};this.middlewares={};this.childModules=undefined;if(!parent){this._etcPrefix=Literal.SERVER_CFG_NAME;this.env=process.env.NODE_ENV||'development';this.absolutePath=options&&options.modulePath?path.resolve(options.modulePath):process.cwd();this.route='';this.serverModule=this;this.displayName=`$[${this.name}]`}else{this._etcPrefix=Literal.APP_CFG_NAME;this.env=parent.env;this.absolutePath=options&&options.modulePath?path.resolve(options.modulePath):path.join(parent.absolutePath,parent.options.childModulesPath,name);if(_.isEmpty(route)){throw new Error.ServerError('Argument "route" is required.')}this.route=Util.ensureLeftSlash(Util.trimRightSlash(Util.urlJoin(parent.route,route)));this.serverModule=parent.serverModule;this.displayName=this.parent.displayName+'->['+this.name+']';if(!Util.fs.existsSync(this.absolutePath)){throw new Error.ServerError(`App module [${this.name}] does not exist.`)}}this.options=Object.assign({childModulesPath:Literal.APP_MODULES_PATH,etcPath:Literal.ETC_PATH},options);this.backendPath=this.toAbsolutePath(Literal.BACKEND_PATH);this.frontendPath=this.toAbsolutePath(Literal.FRONTEND_PATH);this.oolongPath=this.toAbsolutePath(Literal.OOLONG_PATH);this.frontendStaticPath=this.toAbsolutePath(Literal.FRONTEND_STATIC_PATH);this.router=new Koa}get hostingHttpServer(){return this.httpServer||this.parent.hostingHttpServer}start_(extraFeatures){this.loadMiddlewareFiles(this.toAbsolutePath(Literal.MIDDLEWARES_PATH));let configVariables={'name':this.name,'serverPath':p=>this.serverModule.toAbsolutePath(p),'modulePath':p=>this.toAbsolutePath(p),'route':p=>p?Util.urlJoin(this.route,p):this.route,'option':node=>Util.getValueByPath(this.options,node),'app':node=>Util.getValueByPath(this.settings,node),'server':node=>Util.getValueByPath(this.serverModule.settings,node),'now':Util.moment()};this.configLoader=new Config(new JsonConfigProvider(this.toAbsolutePath(this.options.etcPath),this._etcPrefix,this.env));return this.configLoader.load(configVariables).then(cfg=>{this.config=cfg;if(!_.isEmpty(extraFeatures))_.extend(this.config,extraFeatures);return this._loadFeatures_().then(()=>{if(this.options.logger){this.logger=this.getService('logger:'+this.options.logger);if(!this.logger){return Promise.reject('No logger')}}if(this.options.verbose){let verboseMessage='Enabled features:\n'+Object.keys(this.features).join('\n')+'\n\n'+'Registered services:\n'+Object.keys(this.services).join('\n')+'\n';this.log('verbose',verboseMessage)}return Promise.resolve(this)})})}stop_(){return Promise.resolve()}toWebPath(relativePath,...pathOrQuery){let url,query;if(pathOrQuery&&pathOrQuery.length>0&&(pathOrQuery.length>1||pathOrQuery[0]!==undefined)){if(_.isObject(pathOrQuery[pathOrQuery.length-1])){query=pathOrQuery.pop()}pathOrQuery.unshift(relativePath);url=Util.urlJoin(this.route,...pathOrQuery)}else{url=Util.urlJoin(this.route,relativePath)}url=Util.ensureLeftSlash(url);if(query){url=Util.urlAppendQuery(url,query);url=url.replace('/?','?')}return url}toAbsolutePath(relativePath){if(arguments.length==0){return this.absolutePath}let parts=Array.prototype.slice.call(arguments);parts.unshift(this.absolutePath);return path.resolve.apply(null,parts)}registerService(name,serviceObject,override){if(name in this.services&&!override){throw new Error.ServerError('Service "'+name+'" already registered!')}this.services[name]=serviceObject}getService(name){if(name in this.services){return this.services[name]}if(this.parent){return this.parent.getService(name)}return undefined}loadMiddlewareFiles(mwPath){let files=Util.glob.sync(path.join(mwPath,'*.js'),{nodir:true});files.forEach(file=>this.registerMiddleware(path.basename(file,'.js'),require(file)))}registerMiddleware(name,middleware){if(name in this.middlewares){throw new Error.ServerError('Middleware "'+name+'" already registered!')}this.middlewares[name]=middleware;this.log('verbose',`Registered middleware [${name}].`)}getMiddleware(name){if(name in this.middlewares){return this.middlewares[name]}if(this.parent){return this.parent.getMiddleware(name)}return undefined}useMiddlewares(router,middlewares){if(this.serverModule.options.deaf)return;_.forOwn(middlewares,(options,name)=>{let middleware=this.getMiddleware(name);if(typeof middleware!=='function'){throw new Error.ServerError('Unregistered middleware: '+name)}if(router.register&&middleware.__metaMatchMethods&&middleware.__metaMatchMethods.length){router.register('(.*)',middleware.__metaMatchMethods,middleware(options,self),{end:false})}else{router.use(middleware(options,this))}this.log('verbose',`Attached middleware [${name}].`)})}addRoute(router,method,route,middlewares){if(this.serverModule.options.deaf)return;let generators=[];_.forOwn(middlewares,(options,name)=>{let middleware=this.getMiddleware(name);if(typeof middleware!=='function'){throw new Error.ServerError('Unregistered middleware: '+name)}generators.push(middleware(options,this));this.log('verbose',`Middleware "${name}" is attached at "${method}:${this.route}${route}".`)});router[method](route,...generators);this.log('verbose',`Route "${method}:${this.route}${route}" is added from module [${this.name}].`)}addRouter(nestedRouter){if(this.serverModule.options.deaf)return;this.router.use(nestedRouter.routes())}addChildModule(baseRoute,childModule){this.childModules||(this.childModules={});this.childModules[childModule.name]=childModule;if(this.serverModule.options.deaf||childModule.httpServer)return;if(childModule.options.host){this.log('verbose',`Child module [${childModule.name}] is mounted at "${childModule.route}" with host pattern: "${childModule.options.host}".`);const vhost=require('koa-virtual-host');this.router.use(vhost(childModule.options.host,childModule.router))}else{this.log('verbose',`Child module [${childModule.name}] is mounted at "${childModule.route}".`);const mount=require('koa-mount');this.router.use(mount(baseRoute,childModule.router))}}log(level,message,meta){message=this.formatLogMessage(message);if(this.logger){if(meta){this.logger.log(level,message,meta)}else{this.logger.log(level,message)}}else if(this.options.verbose||level<=3){console.log(level+': '+message+(meta?' Related: '+JSON.stringify(meta,null,4):''))}}formatLogMessage(message){if(this.serverModule.options.logWithModuleName){return this.displayName+'# '+message}return message}prepareActionContext(ctx){ctx.appModule=this;Object.assign(ctx.state,{_ctx:ctx,_module:this,_util:{__:this.__,makePath:(relativePath,query)=>this.toWebPath(relativePath,query),makeUrl:(relativePath,query)=>this.origin+this.toWebPath(relativePath,query)}})}_loadFeatures_(){let featureGroups={[Feature.INIT]:[],[Feature.DBMS]:[],[Feature.SERVICE]:[],[Feature.ENGINE]:[],[Feature.MIDDLEWARE]:[],[Feature.ROUTING]:[]};_.forOwn(this.config,(block,name)=>{let feature=this.features[name]||this._loadFeature(name);if(!(name in this.features)){this.features[name]=feature}if(!feature.type){throw new Error.ServerError(`Missing feature type. Feature: ${name}`)}if(!(feature.type in featureGroups)){throw new Error.ServerError(`Invalid feature type. Feature: ${name}, type: ${feature.type}`)}featureGroups[feature.type].push(()=>{this.log('verbose',`Loading feature: ${name} ...`);return feature.load_(this,block)})});let featureLevels=Object.keys(featureGroups);let result=Promise.resolve();featureLevels.forEach(level=>{result=result.then(()=>{this.emit('before:'+level);return Promise.resolve()});featureGroups[level].forEach(promiseFactory=>{result=result.then(promiseFactory)});result=result.then(()=>{this.emit('after:'+level);return Promise.resolve()})});return result}_loadFeature(feature){let extensionJs=this.toAbsolutePath(Literal.FEATURES_PATH,feature+'.js');if(!Util.fs.existsSync(extensionJs)){if(this.parent){return this.parent._loadFeature(feature)}else{extensionJs=path.resolve(__dirname,'features',feature+'.js');if(!Util.fs.existsSync(extensionJs)){throw new Error.ServerError(`Feature "${feature}" not exist.`)}}}let featureObj=require(extensionJs);featureObj.name=feature;return featureObj}}module.exports=AppModule;