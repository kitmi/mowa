const path=require('path'),webpack=require('webpack'),Util=require('../../../util.js'),_=Util._,fs=Util.fs,Promise=Util.Promise,shell=require('shelljs'),MowaHelper=require('../../mowa-helper.js'),webpackComponents=require('./components.js');exports.moduleDesc='Provide commands to run webpack tasks.';exports.commandsDesc={'init':'Initialize webpack environment.','config':'Regenerate webpack config','install':'Install webpack components','babel':'Install babel plugins','build':'Build client bundles with webpack.'};exports.help=function(api){let cmdOptions={};switch(api.command){case'init':case'config':case'build':cmdOptions['app']={desc:'The name of the app to operate',required:true,inquire:true,promptType:'list',choicesProvider:()=>Promise.resolve(MowaHelper.getAvailableAppNames(api))};break;case'babel':cmdOptions['app']={desc:'The name of the app to operate',required:true,inquire:true,promptType:'list',choicesProvider:()=>Promise.resolve(MowaHelper.getAvailableAppNames(api))};cmdOptions['plugins']={desc:'The babel plugins to install',required:true,inquire:true,promptType:'checkbox',choicesProvider:()=>Promise.resolve(require('./babelPlugins.js'))};break;case'install':cmdOptions['app']={desc:'The name of the app to operate',required:true,inquire:true,promptType:'list',choicesProvider:()=>Promise.resolve(MowaHelper.getAvailableAppNames(api))};cmdOptions['package']={desc:'The name of the webpack component package to install',alias:['pkg'],required:true,inquire:true,promptType:'list',choicesProvider:()=>Promise.resolve(webpackComponents.componentGroup)};break;case'help':default:break;}return cmdOptions};exports.init=async api=>{api.log('verbose','exec => mowa webpack init');let appModule=MowaHelper.getAppModuleToOperate(api);await exports.config(api);shell.cd(appModule.absolutePath);let stdout=Util.runCmdSync('npm i --save-dev babel-loader babel-core babel-preset-env babel-preset-react webpack webpack-merge extract-text-webpack-plugin css-loader style-loader file-loader expose-loader sass-loader node-sass');shell.cd(api.base);api.log('verbose',stdout);api.log('info','Enabled webpack.')};exports.config=async api=>{api.log('verbose','exec => mowa webpack config');let appModule=MowaHelper.getAppModuleToOperate(api);const swig=require('swig-templates');let defaultTemplate=path.resolve(__dirname,'template','etc','webpack.default.js.swig'),webpackOptions=Util.getValueByPath(appModule.settings,'deploy.webpack',{}),appEtcPath=appModule.toAbsolutePath(appModule.options.etcPath),templateValues={profileName:'browser',clientPath:path.relative(appEtcPath,appModule.frontendPath),outputPath:path.relative(appEtcPath,appModule.frontendStaticPath),publicPath:Util.ensureRightSlash(Util.ensureLeftSlash(appModule.route)),cleanBeforeBuild:webpackOptions.cleanBeforeBuild||false},webpackDefault=swig.renderFile(defaultTemplate,templateValues);fs.writeFileSync(path.join(appModule.absolutePath,'etc','webpack.default.js'),webpackDefault);api.log('info','Generated webpack.default.js.');let devTemplate=path.resolve(__dirname,'template','etc','webpack.development.js.swig'),webpackDev=swig.renderFile(devTemplate,templateValues);fs.writeFileSync(path.join(appModule.absolutePath,'etc','webpack.development.js'),webpackDev);api.log('info','Generated webpack.development.js.');let prodTemplate=path.resolve(__dirname,'template','etc','webpack.production.js.swig'),webpackProd=swig.renderFile(prodTemplate,templateValues);fs.writeFileSync(path.join(appModule.absolutePath,'etc','webpack.production.js'),webpackProd);api.log('info','Generated webpack.production.js.')};exports.install=function(api){api.log('verbose','exec => mowa webpack install');let pkgName=api.getOption('pkg'),appModule=MowaHelper.getAppModuleToOperate(api),pkgs=webpackComponents.componentPackages[pkgName],pkgsLine=pkgs.join(' '),appPath=appModule.absolutePath;shell.cd(appPath);let stdout=Util.runCmdSync(`npm i --save-dev ${pkgsLine}`);shell.cd(api.base);api.log('verbose',stdout);api.log('info',`Installed webpack component: ${pkgsLine}.`)};exports.babel=function(api){api.log('verbose','exec => mowa webpack babel');let appModule=MowaHelper.getAppModuleToOperate(api),plugins=api.getOption('plugins'),cmdLine=plugins.map(p=>'babel-plugin-'+p).join(' ');shell.cd(appModule.absolutePath);let stdout=Util.runCmdSync('npm i --save-dev '+cmdLine);shell.cd(api.base);api.log('verbose',stdout);api.log('info','Babel plugins installed');api.log('info','Add below plugins into the plugin list of babel-loader in webpack config file to enable these features.');api.log('info','plugins: [ \''+plugins.join('\', \'')+'\' ]');if(-1<plugins.indexOf('transform-decorators-legacy')||-1<plugins.indexOf('transform-class-properties')){api.log('info','Notice: "transform-decorators-legacy" should appear before "transform-class-properties"')}};exports.build=function(api){api.log('verbose','exec => mowa webpack build');let appModule=MowaHelper.getAppModuleToOperate(api);api.log('info',`Start webpacking ...`);let env=api.getOption('env'),config=require(appModule.toAbsolutePath('etc','webpack.'+env+'.js'));var compiler=webpack(config);return new Promise((resolve,reject)=>{compiler.run(function(err,stats){if(err){reject(err)}else{var jsonStats=stats.toJson('minimal');if(0<jsonStats.errors.length){reject(jsonStats.errors.join('\n'))}else{api.log('verbose',stats.toString({chunks:false,colors:true}));api.log('info',`Client files are packed successfully.`);resolve()}}})})};