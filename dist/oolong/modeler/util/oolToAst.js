'use strict';const Util=require('../../../util.js'),_=Util._,S=Util.S,JsLang=require('./ast.js'),OolUtil=require('../../lang/ool-utils.js'),OolongModifiers=require('../../runtime/modifiers.js'),OolongValidators=require('../../runtime/validators.js'),Types=require('../../runtime/types.js'),defaultError='InvalidRequest',AST_BLK_FIELD_PRE_PROCESS='FieldPreProcess',AST_BLK_PARAM_SANITIZE='ParameterSanitize',AST_BLK_MODIFIER_CALL='ModifierCall',AST_BLK_VALIDATOR_CALL='ValidatorCall',AST_BLK_VIEW_OPERATION='ViewOperation',AST_BLK_VIEW_RETURN='ViewReturn',AST_BLK_INTERFACE_OPERATION='InterfaceOperation',AST_BLK_INTERFACE_RETURN='InterfaceReturn',AST_BLK_EXCEPTION_ITEM='ExceptionItem';function compileConditionalExpression(test,compileContext,startTopoId){if(_.isPlainObject(test)){if('BinaryExpression'===test.oolType){let endTopoId=createTopoId(compileContext,startTopoId+'$binOp:done'),op;switch(test.operator){case'>':case'<':case'>=':case'<=':case'in':op=test.operator;break;case'and':op='&&';break;case'or':op='||';break;case'=':op='===';break;case'!=':op='!==';break;default:throw new Error('Unsupported test operator: '+test.operator);}let leftTopoId=createTopoId(compileContext,startTopoId+'$binOp:left'),rightTopoId=createTopoId(compileContext,startTopoId+'$binOp:right');dependsOn(compileContext,startTopoId,leftTopoId);dependsOn(compileContext,startTopoId,rightTopoId);let lastLeftId=compileConditionalExpression(test.left,compileContext,leftTopoId),lastRightId=compileConditionalExpression(test.right,compileContext,rightTopoId);dependsOn(compileContext,lastLeftId,endTopoId);dependsOn(compileContext,lastRightId,endTopoId);compileContext.astMap[endTopoId]=JsLang.astBinExp(getCodeRepresentationOf(lastLeftId,compileContext),op,getCodeRepresentationOf(lastRightId,compileContext));return endTopoId}else if('UnaryExpression'===test.oolType){let endTopoId=createTopoId(compileContext,startTopoId+'$unaOp:done'),operandTopoId=createTopoId(compileContext,startTopoId+'$unaOp');dependsOn(compileContext,startTopoId,operandTopoId);let lastOperandTopoId=compileConditionalExpression(test.argument,compileContext,operandTopoId);dependsOn(compileContext,lastOperandTopoId,endTopoId);let astArgument=getCodeRepresentationOf(lastOperandTopoId,compileContext);switch(test.operator){case'exists':compileContext.astMap[endTopoId]=JsLang.astNot(JsLang.astCall('_.isEmpty',astArgument));break;case'is-not-null':compileContext.astMap[endTopoId]=JsLang.astNot(JsLang.astCall('_.isNil',astArgument));break;case'not-exists':compileContext.astMap[endTopoId]=JsLang.astCall('_.isEmpty',astArgument);break;case'is-null':compileContext.astMap[endTopoId]=JsLang.astCall('_.isNil',astArgument);break;case'not':compileContext.astMap[endTopoId]=JsLang.astNot(astArgument);break;default:throw new Error('Unsupported test operator: '+test.operator);}return endTopoId}else{let valueStartTopoId=createTopoId(compileContext,startTopoId+'$value');dependsOn(compileContext,startTopoId,valueStartTopoId);return compileConcreteValueExpression(valueStartTopoId,test,compileContext)}}compileContext.astMap[startTopoId]=JsLang.astValue(test);return startTopoId}function compileFunctor(value,functors,compileContext,topoInfo,functorType){let l=functors.length,lastTopoId=topoInfo.lastTopoId;for(let i=0;i<l;i++){let functor=functors[i],declareParams=translateFunctionParams([value].concat(functor.args)),functorId=translateFunctor(functor,functorType,compileContext,declareParams),topoId=createTopoId(compileContext,topoInfo.topoIdPrefix+'['+i.toString()+']'+functorId),callArgs=functor.args?translateArgs(topoId,functor.args,compileContext):[];compileContext.astMap[topoId]=JsLang.astCall(functorId,[value].concat(callArgs));if(lastTopoId){dependsOn(compileContext,lastTopoId,topoId)}lastTopoId=topoId;if(-1===topoId.indexOf(':arg[')&&-1===topoId.indexOf('$cases[')&&-1===topoId.indexOf('$exceptions[')){addCodeBlock(compileContext,topoId,{type:functorType===OolUtil.FUNCTOR_VALIDATOR?AST_BLK_VALIDATOR_CALL:AST_BLK_MODIFIER_CALL,target:value.name})}}return lastTopoId}function addFunctorToMap(functorId,functorType,functorJsFile,mapOfFunctorToFile){if(mapOfFunctorToFile[functorId]&&mapOfFunctorToFile[functorId]!==functorJsFile){throw new Error(`Conflict: ${functorType} naming "${functorId}" conflicts!`)}mapOfFunctorToFile[functorId]=functorJsFile}function translateFunctor(functor,functorType,compileContext,args){let functionName,fileName,functorId;if(OolUtil.isMemberAccess(functor.name)){let names=OolUtil.extractMemberAccess(functor.name);if(2<names.length){throw new Error('Not supported reference type: '+functor.name)}let refEntityName=names[0];functionName=names[1];fileName='./'+functorType+'s/'+refEntityName+'-'+functionName+'.js';functorId=refEntityName+_.upperFirst(functionName);addFunctorToMap(functorId,functorType,fileName,compileContext.mapOfFunctorToFile)}else{functionName=functor.name;let builtins;switch(functorType){case OolUtil.FUNCTOR_VALIDATOR:builtins=OolongValidators;break;case OolUtil.FUNCTOR_MODIFIER:builtins=OolongModifiers;break;default:throw new Error('Not supported!');}if(!(functionName in builtins)){fileName='./'+functorType+'s/'+compileContext.targetName+'-'+functionName+'.js';functorId=functionName;addFunctorToMap(functorId,functorType,fileName,compileContext.mapOfFunctorToFile);compileContext.newFunctorFiles.push({functionName,functorType,fileName,args})}else{functorId=functorType+'s.'+functionName}}return functorId}function compileVariableReference(startTopoId,varOol,compileContext){let lastTopoId=startTopoId,[baseName,others]=varOol.name.split('.',2);if(compileContext.modelVars&&compileContext.modelVars.has(baseName)&&others){varOol.name=baseName+'.data.'+others}let simpleValue=true;if(!_.isEmpty(varOol.validators0)){lastTopoId=compileFunctor(varOol,varOol.validators0,compileContext,{topoIdPrefix:startTopoId+':stage0~',lastTopoId},OolUtil.FUNCTOR_VALIDATOR);simpleValue=false}if(!_.isEmpty(varOol.modifiers0)){lastTopoId=compileFunctor(varOol,varOol.modifiers0,compileContext,{topoIdPrefix:startTopoId+':stage0~',lastTopoId},OolUtil.FUNCTOR_MODIFIER);simpleValue=false}if(!_.isEmpty(varOol.validators1)){lastTopoId=compileFunctor(varOol,varOol.validators1,compileContext,{topoIdPrefix:startTopoId+':stage1|',lastTopoId},OolUtil.FUNCTOR_VALIDATOR);simpleValue=false}if(!_.isEmpty(varOol.modifiers1)){lastTopoId=compileFunctor(varOol,varOol.modifiers1,compileContext,{topoIdPrefix:startTopoId+':stage1|',lastTopoId},OolUtil.FUNCTOR_MODIFIER);simpleValue=false}if(!simpleValue){return lastTopoId}compileContext.astMap[startTopoId]=JsLang.astValue(varOol);return startTopoId}function translateFunctionParams(args){if(_.isEmpty(args))return[];return _.map(args,(arg,i)=>{if(_.isPlainObject(arg)&&'ObjectReference'===arg.oolType){if(OolUtil.isMemberAccess(arg.name)){return OolUtil.extractMemberAccess(arg.name).pop()}return arg.name}return'param'+(i+1).toString()})}function compileConcreteValueExpression(startTopoId,value,compileContext){if(_.isPlainObject(value)){if('ComputedValue'===value.oolType){value=Object.assign({},_.omit(value,['value']),value.value)}if('ObjectReference'===value.oolType){let[refBase,...rest]=OolUtil.extractMemberAccess(value.name),dependency;if(compileContext.modelVars&&compileContext.modelVars.has(refBase)){dependency=refBase}else if('latest'===refBase&&0<rest.length){dependency=rest.pop()+':ready'}else if(_.isEmpty(rest)){dependency=refBase+':ready'}else{throw new Error('mark')}dependsOn(compileContext,dependency,startTopoId);return compileVariableReference(startTopoId,value,compileContext)}}compileContext.astMap[startTopoId]=JsLang.astValue(value);return startTopoId}function translateArgs(topoId,args,compileContext){args=_.castArray(args);if(_.isEmpty(args))return[];let callArgs=[];_.each(args,(arg,i)=>{let argTopoId=createTopoId(compileContext,topoId+':arg['+(i+1).toString()+']'),lastTopoId=compileConcreteValueExpression(argTopoId,arg,compileContext);dependsOn(compileContext,lastTopoId,topoId);callArgs=callArgs.concat(_.castArray(getCodeRepresentationOf(lastTopoId,compileContext)))});return callArgs}function compileParam(index,param,compileContext){let type=param.type,sanitizerName;switch(type){case Types.TYPE_INT:sanitizerName='validators.$processInt';break;case Types.TYPE_FLOAT:sanitizerName='validators.$processFloat';break;case Types.TYPE_BOOL:sanitizerName='validators.$processBool';break;case Types.TYPE_TEXT:sanitizerName='validators.$processText';break;case Types.TYPE_BINARY:sanitizerName='validators.$processBinary';break;case Types.TYPE_DATETIME:sanitizerName='validators.$processDatetime';break;case Types.TYPE_JSON:sanitizerName='validators.$processJson';break;case Types.TYPE_XML:sanitizerName='validators.$processXml';break;case Types.TYPE_ENUM:sanitizerName='validators.$processEnum';break;case Types.TYPE_CSV:sanitizerName='validators.$processCsv';break;default:throw new Error('Unknown field type: '+type);}let varRef=JsLang.astVarRef('$sanitizeState'),callAst=JsLang.astCall(sanitizerName,[JsLang.astArrayAccess('$meta.params',index),JsLang.astVarRef(param.name)]),prepareTopoId=createTopoId(compileContext,'$params:sanitize['+index.toString()+']'),sanitizeStarting;if(0===index){sanitizeStarting=JsLang.astVarDeclare(varRef,callAst,false,false,`Sanitize param "${param.name}"`)}else{sanitizeStarting=JsLang.astAssign(varRef,callAst,`Sanitize param "${param.name}"`);let lastPrepareTopoId='$params:sanitize['+(index-1).toString()+']';dependsOn(compileContext,lastPrepareTopoId,prepareTopoId)}compileContext.astMap[prepareTopoId]=[sanitizeStarting,JsLang.astIf(JsLang.astVarRef('$sanitizeState.error'),JsLang.astReturn(JsLang.astVarRef('$sanitizeState'))),JsLang.astAssign(JsLang.astVarRef(param.name),JsLang.astVarRef('$sanitizeState.sanitized'))];addCodeBlock(compileContext,prepareTopoId,{type:AST_BLK_PARAM_SANITIZE});dependsOn(compileContext,prepareTopoId,compileContext.mainStartId);let topoId=createTopoId(compileContext,param.name);dependsOn(compileContext,compileContext.mainStartId,topoId);let value=normalizeVariableReference(param.name,param),endTopoId=compileVariableReference(topoId,value,compileContext),readyTopoId=createTopoId(compileContext,topoId+':ready');dependsOn(compileContext,endTopoId,readyTopoId);return readyTopoId}function compileField(param,compileContext){let topoId=createTopoId(compileContext,param.name),contextName='latest.'+param.name;compileContext.astMap[topoId]=JsLang.astVarRef(contextName);let value=normalizeVariableReference(contextName,param),endTopoId=compileVariableReference(topoId,value,compileContext),readyTopoId=createTopoId(compileContext,topoId+':ready');dependsOn(compileContext,endTopoId,readyTopoId);return readyTopoId}function normalizeVariableReference(name,value){return Object.assign({oolType:'ObjectReference',name:name},_.pick(value,OolUtil.FUNCTORS_LIST))}function translateThenAst(startId,endId,then,compileContext,assignTo){if(_.isPlainObject(then)){if('ThrowExpression'===then.oolType){return JsLang.astThrow(then.errorType||defaultError,then.message||[])}if('ReturnExpression'===then.oolType){return translateReturnValueAst(startId,endId,then.value,compileContext)}}if(!assignTo){return JsLang.astReturn(then)}return JsLang.astAssign(assignTo,then)}function translateReturnValueAst(startTopoId,endTopoId,value,compileContext){let valueTopoId=compileConcreteValueExpression(startTopoId,value,compileContext);if(valueTopoId!==startTopoId){dependsOn(compileContext,valueTopoId,endTopoId)}return JsLang.astReturn(getCodeRepresentationOf(valueTopoId,compileContext))}function compileReturn(startTopoId,value,compileContext){let endTopoId=createTopoId(compileContext,'$return');dependsOn(compileContext,startTopoId,endTopoId);compileContext.astMap[endTopoId]=translateReturnValueAst(startTopoId,endTopoId,value,compileContext);addCodeBlock(compileContext,endTopoId,{type:AST_BLK_VIEW_RETURN});return endTopoId}function compileFindOne(index,operation,compileContext,dependency){let endTopoId=createTopoId(compileContext,'op$'+index.toString()),conditionVarName=endTopoId+'$condition',ast=[JsLang.astVarDeclare(conditionVarName)];if(operation.case){let topoIdPrefix=endTopoId+'$cases',lastStatement;if(operation.case.else){let elseStart=createTopoId(compileContext,topoIdPrefix+':else'),elseEnd=createTopoId(compileContext,topoIdPrefix+':end');dependsOn(compileContext,elseStart,elseEnd);dependsOn(compileContext,elseEnd,endTopoId);lastStatement=translateThenAst(elseStart,elseEnd,operation.case.else,compileContext,conditionVarName)}else{lastStatement=JsLang.astThrow('ServerError','Unexpected state.')}if(_.isEmpty(operation.case.items)){throw new Error('Missing case items')}_.reverse(operation.case.items).forEach((item,i)=>{if('ConditionalStatement'!==item.oolType){throw new Error('Invalid case item.')}i=operation.case.items.length-i-1;let casePrefix=topoIdPrefix+'['+i.toString()+']',caseTopoId=createTopoId(compileContext,casePrefix);dependsOn(compileContext,dependency,caseTopoId);let caseResultVarName='$'+topoIdPrefix+'_'+i.toString(),lastTopoId=compileConditionalExpression(item.test,compileContext,caseTopoId),astCaseTtem=getCodeRepresentationOf(lastTopoId,compileContext);astCaseTtem=JsLang.astVarDeclare(caseResultVarName,astCaseTtem,true,false,`Condition ${i} for find one ${operation.model}`);let ifStart=createTopoId(compileContext,casePrefix+':then'),ifEnd=createTopoId(compileContext,casePrefix+':end');dependsOn(compileContext,lastTopoId,ifStart);dependsOn(compileContext,ifStart,ifEnd);lastStatement=[astCaseTtem,JsLang.astIf(JsLang.astVarRef(caseResultVarName),JsLang.astBlock(translateThenAst(ifStart,ifEnd,item.then,compileContext,conditionVarName)),lastStatement)];dependsOn(compileContext,ifEnd,endTopoId)});ast=ast.concat(_.castArray(lastStatement))}else if(operation.condition){throw new Error('operation.condition tbi')}else{throw new Error('tbi')}ast.push(JsLang.astVarDeclare(operation.model,JsLang.astAwait(`this.findOne`,JsLang.astVarRef(conditionVarName))));let modelTopoId=createTopoId(compileContext,operation.model);dependsOn(compileContext,endTopoId,modelTopoId);compileContext.astMap[endTopoId]=ast;return endTopoId}function compileDbOperation(index,operation,compileContext,dependency){let lastTopoId;switch(operation.oolType){case'findOne':lastTopoId=compileFindOne(index,operation,compileContext,dependency);break;case'find':throw new Error('tbi');break;case'update':throw new Error('tbi');break;case'create':throw new Error('tbi');break;case'delete':throw new Error('tbi');break;case'javascript':throw new Error('tbi');break;case'assignment':throw new Error('tbi');break;default:throw new Error('Unsupported operation type: '+operation.type);}addCodeBlock(compileContext,lastTopoId,{type:AST_BLK_INTERFACE_OPERATION});return lastTopoId}function compileExceptionalReturn(oolNode,compileContext,dependency){let endTopoId=createTopoId(compileContext,'$return'),lastExceptionId=dependency;if(!_.isEmpty(oolNode.exceptions)){oolNode.exceptions.forEach((item,i)=>{if(_.isPlainObject(item)){if('ConditionalStatement'!==item.oolType){throw new Error('Unsupported exceptional type: '+item.oolType)}let exceptionStartId=createTopoId(compileContext,endTopoId+':except['+i.toString()+']'),exceptionEndId=createTopoId(compileContext,endTopoId+':except['+i.toString()+']:done');if(lastExceptionId){dependsOn(compileContext,lastExceptionId,exceptionStartId)}let lastTopoId=compileConditionalExpression(item.test,compileContext,exceptionStartId),thenStartId=createTopoId(compileContext,exceptionStartId+':then');dependsOn(compileContext,lastTopoId,thenStartId);dependsOn(compileContext,thenStartId,exceptionEndId);compileContext.astMap[exceptionEndId]=JsLang.astIf(getCodeRepresentationOf(lastTopoId,compileContext),JsLang.astBlock(translateThenAst(thenStartId,exceptionEndId,item.then,compileContext)),null,`Return on exception #${i}`);addCodeBlock(compileContext,exceptionEndId,{type:AST_BLK_EXCEPTION_ITEM});lastExceptionId=exceptionEndId}else{throw new Error('Unexpected.')}})}dependsOn(compileContext,lastExceptionId,endTopoId);let returnStartTopoId=createTopoId(compileContext,'$return:value');dependsOn(compileContext,returnStartTopoId,endTopoId);compileContext.astMap[endTopoId]=translateReturnValueAst(returnStartTopoId,endTopoId,oolNode.value,compileContext);addCodeBlock(compileContext,endTopoId,{type:AST_BLK_INTERFACE_RETURN});return endTopoId}function createTopoId(compileContext,name){if(compileContext.topoNodes.has(name)){throw new Error(`Topo id "${name}" already created.`)}compileContext.topoNodes.add(name);return name}function dependsOn(compileContext,previousOp,currentOp){compileContext.logger.debug(currentOp+' \x1B[33mdepends on\x1B[0m '+previousOp);if(!compileContext.topoNodes.has(currentOp)){throw new Error(`Topo id "${currentOp}" not created.`)}compileContext.topoSort.add(previousOp,currentOp)}function addCodeBlock(compileContext,topoId,blockMeta){if(!(topoId in compileContext.astMap)){throw new Error(`AST not found for block with topoId: ${topoId}`)}compileContext.sourceMap.set(topoId,blockMeta);compileContext.logger.verbose(`Adding ${blockMeta.type} "${topoId}" into source code.`);compileContext.logger.debug('AST:\n'+JSON.stringify(compileContext.astMap[topoId],null,2))}function getCodeRepresentationOf(topoId,compileContext){let lastSourceType=compileContext.sourceMap.get(topoId);if(lastSourceType&&lastSourceType.type===AST_BLK_MODIFIER_CALL){return JsLang.astVarRef(lastSourceType.target)}return compileContext.astMap[topoId]}function createCompileContext(targetName,dbServiceId,logger,sharedContext){let compileContext={targetName,dbServiceId,logger,topoNodes:new Set,topoSort:Util.createTopoSort(),astMap:{},sourceMap:new Map,modelVars:new Set,mapOfFunctorToFile:sharedContext&&sharedContext.mapOfFunctorToFile||{},newFunctorFiles:sharedContext&&sharedContext.newFunctorFiles||[]};compileContext.mainStartId=createTopoId(compileContext,'$main');logger.verbose(`Created compilation context for target "${targetName}" with db service "${dbServiceId}".`);return compileContext}module.exports={compileParam,compileField,compileDbOperation,compileExceptionalReturn,compileReturn,createTopoId,createCompileContext,dependsOn,addCodeBlock,AST_BLK_FIELD_PRE_PROCESS,AST_BLK_MODIFIER_CALL,AST_BLK_VALIDATOR_CALL,AST_BLK_VIEW_OPERATION,AST_BLK_VIEW_RETURN,AST_BLK_INTERFACE_OPERATION,AST_BLK_INTERFACE_RETURN,AST_BLK_EXCEPTION_ITEM};