'use strict';const Util=require('../../util.js'),_=Util._,KW_NAMESPACE='use',KW_SCHEMA='schema',KW_ENTITIES='entities',KW_ENTITY_AS_ALIAS='as',KW_TYPE_DEFINE='type',KW_ENTITY='entity',KW_WITH_FEATURE='with',KW_FIELDS='has',KW_INDEXES='index';let OolCodeGen=class OolCodeGen{constructor(options){this.indented=0;this.content='';this.options=options}generate(json){this.generateObject(json);return this.content}appendLine(line){if(line){if(1<arguments.length){line=[...arguments].join(' ')}this.content+=(0<this.indented?_.repeat(' ',this.indented):'')+line+'\n'}else{this.content+='\n'}return this}indent(){this.indented+=2;return this}dedent(){this.indented-=2;return this}generateObject(obj){_.forOwn(obj,(v,k)=>{let generateMethod='generate_'+k;if(generateMethod in this){return this[generateMethod](v)}throw new Error('to be implemented.')})}generate_namespace(namespaces){if(0<namespaces.length){this.appendLine(KW_NAMESPACE).indent();namespaces.forEach(ns=>{this.appendLine(Util.quote(ns,'\''))});this.dedent()}}generate_schema(schema){this.appendLine(KW_SCHEMA,Util.quote(schema.name,'\'')).indent();if(schema.entities){this.appendLine(KW_ENTITIES).indent();schema.entities.forEach(entityEntry=>{if(entityEntry.alias){this.appendLine(entityEntry.entity,KW_ENTITY_AS_ALIAS,entityEntry.alias)}else{this.appendLine(entityEntry.entity)}});this.dedent().appendLine()}this.dedent()}generate_type(types){if(!_.isEmpty(types)){this.appendLine(KW_TYPE_DEFINE).indent();_.forOwn(types,(type,name)=>{if('enum'===type.type){this.appendLine(name,':',JSON.stringify(type.values))}else{this.appendLine(name,':',type.type)}});this.dedent()}}generate_entity(entities){_.forOwn(entities,(entity,name)=>{this.appendLine(KW_ENTITY,name).indent();let firstSection=true;if(!_.isEmpty(entity.features)){this.appendLine(KW_WITH_FEATURE).indent();entity.features.forEach(feature=>{if(feature.options){this.appendLine(feature.name+'('+JSON.stringify(feature.options)+')')}else{this.appendLine(feature.name)}});this.dedent();firstSection=false}if(!_.isEmpty(entity.fields)){if(!firstSection){this.appendLine()}this.appendLine(KW_FIELDS).indent();_.forOwn(entity.fields,(field,name)=>{let lineInfo=[name];if(field.type!==name){lineInfo.push(':');switch(field.type){case'int':lineInfo.push(field.type);break;case'float':case'decimal':lineInfo.push(field.type);break;case'text':case'binary':if(field.fixedLength){lineInfo.push(field.type+'('+field.fixedLength+')','fixedLength')}else if(field.maxLength){lineInfo.push(field.type+'('+field.maxLength+')')}else{lineInfo.push(field.type)}break;case'datetime':lineInfo.push(field.type);break;default:lineInfo.push(field.type);}}if(field.readOnly){lineInfo.push('readOnly')}if(field.writeOnceOnly){lineInfo.push('writeOnceOnly')}if(field.fixedValue){lineInfo.push('fixed')}if(field.optional){lineInfo.push('optional')}if('default'in field){lineInfo.push('default('+JSON.stringify(field.default)+')')}else if(field.auto){lineInfo.push('default(auto)')}if(field.validators0){field.validators0.forEach(v=>{lineInfo.push('~'+this._translateFunctor(v))})}if(field.modifiers0){field.modifiers0.forEach(v=>{lineInfo.push('|'+this._translateFunctor(v))})}if(field.validators1){field.validators1.forEach(v=>{lineInfo.push('~'+this._translateFunctor(v))})}if(field.modifiers1){field.modifiers1.forEach(v=>{lineInfo.push('|'+this._translateFunctor(v))})}this.appendLine(...lineInfo)});this.dedent();firstSection=false}if(!_.isEmpty(entity.indexes)){if(!firstSection){this.appendLine()}this.appendLine(KW_INDEXES).indent();entity.indexes.forEach(i=>{let indexInfo=[];if(Array.isArray(i.fields)){indexInfo.push('['+i.fields.join(', ')+']')}if(i.unique){indexInfo.push('is');indexInfo.push('unique')}this.appendLine(...indexInfo)});this.dedent()}this.dedent()})}_translateFunctor(f){let r=f.name;if(!_.isEmpty(f.args)){r+='(';f.args.forEach((a,i)=>{if(0<i){r+=', '}if(_.isPlainObject(a)){if('ObjectReference'===a.oolType){r+='@'+a.name}else{throw new Error('to be implemented.')}}else{r+=JSON.stringify(a)}});r+=')'}return r}};exports.generate=function(json,options){let codeGen=new OolCodeGen(options);return codeGen.generate(json)};