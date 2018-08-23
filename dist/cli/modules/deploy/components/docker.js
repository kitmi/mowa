'use strict';const Util=require('../../../../util.js'),_=Util._,Promise=Util.Promise,ComponentBase=require('../componentbase.js'),config={lts:true};let Docker=class Docker extends ComponentBase{constructor(manager,session,instanceName,options){super(manager,session,instanceName,options)}async doTest_(){let result={},ver=await this._ssh_('docker -v',false);if(0<ver.length&&'D'===ver[0]){result['installed']=true}else{return{installed:false,started:false}}let countText=await this._ssh_('ps -ef |grep node |grep -v "grep" |wc -l');result['started']=0<parseInt(countText);return result}async doInstall_(){let nvmInstall='nvm install '+(this.options.lts?'--lts node':'node');return this._ssh_(nvmInstall)}async doUninstall_(){let nvmUninstall='nvm uninstall '+(this.options.lts?'--lts node':'node');return this._ssh_(nvmUninstall)}async doStart_(){}async doStop_(){}};Docker.componentType='docker';Docker.defaultInstanceName='dockerInstance';Docker.defaultConfig=config;module.exports=Docker;