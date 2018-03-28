"use strict";

const Util = require('../../util.js');
const _ = Util._;
const fs = Util.fs;

const path = require('path');
const OolUtil = require('../lang/ool-utils.js');
const JsLang = require('./util/ast.js');
const OolongField = require('../lang/field.js');
const OolongModifiers = require('../runtime/modifiers.js');
const OolongValidators = require('../runtime/validators.js');
const Snippets = require('./dao/snippets');

const escodegen = require('escodegen');
const TopoSort = require('topo-sort');
const Trie = require('trie').Trie;

const OolToAst = require('./util/oolToAst.js');

const swig  = require('swig-templates');

class DaoModeler {
    /**
     * Oolong database access object (DAO) modeler
     * @constructs OolongDaoModeler
     * @param {object} context
     * @property {Logger} context.logger - Logger object
     * @property {AppModule} context.currentApp - Current app module
     * @property {bool} context.verbose - Verbose mode
     * @property {OolongLinker} context.linker - Oolong DSL linker
     * @param {string} buildPath
     */
    constructor(context, buildPath) {
        this.logger = context.logger;
        this.linker = context.linker;
        this.verbose = context.verbose;
        this.buildPath = buildPath;
    }

    modeling(schema, dbService) {
        this.logger.log('info', 'Modeling database access object (DAO) for schema "' + schema.name + '"...');

        this._generateSchemaModel(schema, dbService);

        _.forOwn(schema.entities, (entity, entityInstanceName) => {
            let capitalized = _.upperFirst(entityInstanceName);

            let ast = JsLang.astProgram();

            JsLang.astPushInBody(ast, JsLang.astRequire('Mowa', 'mowa'));
            JsLang.astPushInBody(ast, JsLang.astVarDeclare('Util', 'Mowa.Util', true));
            JsLang.astPushInBody(ast, JsLang.astVarDeclare('_', 'Util._', true));
            JsLang.astPushInBody(ast, JsLang.astVarDeclare([ 'InvalidRequest', 'ServerError' ], 'Mowa.Error', true, true));
            JsLang.astPushInBody(ast, JsLang.astRequire('Model', `mowa/dist/oolong/runtime/models/${dbService.dbType}`));
            JsLang.astPushInBody(ast, JsLang.astRequire('validators', 'mowa/dist/oolong/runtime/validators'));
            JsLang.astPushInBody(ast, JsLang.astRequire('modifiers', 'mowa/dist/oolong/runtime/modifiers'));
            JsLang.astPushInBody(ast, JsLang.astRequire([ 'ModelValidationError', 'ModelOperationError', 'ModelResultError' ], 'mowa/dist/oolong/runtime/errors', true));

            let astClassMain = this._processFieldsValidatorsAndModifiers(dbService, entity, capitalized);

            //console.dir(entity.fields, {depth: 8, colors: true});
            //console.dir(entity.interfaces, {depth: 8, colors: true});

            let uniqueKeys = [ [ entity.key ] ];

            entity.indexes.forEach(index => {
                if (index.unique) {
                    uniqueKeys.push(index.fields);
                }
            });

            let modelMetaInit = {
                schemaName: schema.name,
                name: entityInstanceName,
                keyField: entity.key,
                fields: _.mapValues(entity.fields, f => f.toJSON()),
                indexes: entity.indexes,
                features: entity.features,
                uniqueKeys
            };

            if (entity.interfaces) {
                let astInterfaces = this._buildInterfaces(entity, dbService, modelMetaInit);
                let astClass = astClassMain[astClassMain.length-1];
                JsLang.astPushInBody(astClass, astInterfaces);
            }

            let modelMeta = JsLang.astValue(modelMetaInit);

            JsLang.astPushInBody(ast, astClassMain);
            JsLang.astPushInBody(ast, JsLang.astAssign(capitalized + '.meta', modelMeta));
            JsLang.astPushInBody(ast, JsLang.astAssign('module.exports', JsLang.astVarRef(capitalized)));

            let modelFilePath = path.resolve(this.buildPath, dbService.dbType, dbService.name, entityInstanceName + '.js');
            fs.writeFileSync(modelFilePath + '.json', JSON.stringify(ast, null, 4));

            DaoModeler._exportSourceCode(ast, modelFilePath);

            this.logger.log('info', 'Generated entity model: ' + modelFilePath);
        });
    }

    _processFieldsValidatorsAndModifiers(dbService, entity, capitalized) {
        let ast = [];

        let mapTopoIdToAst = {};
        let mapValidatorToFile = {};
        let mapModifierToFile = {};
        let trie = new Trie();
        let tsort = new TopoSort();

        //check validators of stage-0
        this._processValidators(dbService, entity, 0, mapValidatorToFile, mapModifierToFile, mapTopoIdToAst, tsort, trie);
        //check modifiers of stage-0
        this._processModifiers(dbService, entity, 0, mapModifierToFile, mapTopoIdToAst, tsort, trie);

        //check validators of stage-1
        this._processValidators(dbService, entity, 1, mapValidatorToFile, mapModifierToFile, mapTopoIdToAst, tsort, trie);
        //check modifiers of stage-1
        this._processModifiers(dbService, entity, 1, mapModifierToFile, mapTopoIdToAst, tsort, trie);

        if (!_.isEmpty(mapValidatorToFile)) {
            _.forOwn(mapValidatorToFile, (jsFile, varName) => {
                ast.push(JsLang.astRequire(varName, './validators/' + jsFile));
            });
        }

        if (!_.isEmpty(mapModifierToFile)) {
            _.forOwn(mapModifierToFile, (jsFile, varName) => {
                ast.push(JsLang.astRequire(varName, './modifiers/' + jsFile));
            });
        }

        let dependencyOrder = tsort.sort();
        let methodBodyCreate = [], methodBodyUpdate = [], lastFieldName, methodBodyUpdateCache = [];

        _.each(dependencyOrder, dep => {
            if (trie.lookup(dep)) {
                let [ fieldName, stage, state ] = dep.split(':');
                if (fieldName[0] === '@') return;
                if (state) {
                    if (stage.length > 1) return;

                    let astDep = mapTopoIdToAst[dep];
                    if (astDep) {
                        let casted = _.castArray(astDep);
                        methodBodyCreate = methodBodyCreate.concat(casted);

                        if (lastFieldName && lastFieldName !== fieldName) {
                            methodBodyUpdate = methodBodyUpdate.concat(Snippets._preUpdateCheckPendingUpdate(lastFieldName, methodBodyUpdateCache));
                            methodBodyUpdateCache = [];
                        }

                        lastFieldName = fieldName;
                        methodBodyUpdateCache = methodBodyUpdateCache.concat(casted);
                    }
                }
            }
        });

        if (!_.isEmpty(methodBodyUpdateCache)) {
            methodBodyUpdate = methodBodyUpdate.concat(Snippets._preUpdateCheckPendingUpdate(lastFieldName, methodBodyUpdateCache));
        }

        //generate _preCreate and _preUpdate functions
        ast.push(JsLang.astClassDeclare(capitalized, 'Model', [
            JsLang.astMemberMethod('_preCreate', [],
                Snippets._preCreateHeader.concat(methodBodyCreate).concat([ JsLang.astReturn(JsLang.astId('context')) ]),
                false, true, false
            ),
            JsLang.astMemberMethod('_preUpdate', [],
                Snippets._preUpdateHeader.concat(methodBodyUpdate).concat([ JsLang.astReturn(JsLang.astId('context')) ]),
                false, true, false
            )
        ]));

        return ast;
    };

    _generateSchemaModel(schema, dbService) {
        let capitalized = Util.S('-' + schema.name).camelize().s;

        let locals = {
            className: capitalized,
            dbName: dbService.name,
            dbType: dbService.dbType,
            serviceId: dbService.serviceId,
            models: Object.keys(schema.entities).map(e => `"${e}"`).join(', ')
        };

        let classTemplate = path.resolve(__dirname, 'dao', 'db.js.swig');
        let classCode = swig.renderFile(classTemplate, locals);

        let modelFilePath = path.resolve(this.buildPath, dbService.dbType, dbService.name + '.js');
        fs.ensureFileSync(modelFilePath);
        fs.writeFileSync(modelFilePath, classCode);

        this.logger.log('info', 'Generated database access object: ' + modelFilePath);
    }

    _generateFunctionTemplateFile(functionCall, dbService, entityName, fieldName, type) {
        assert: type === 'validator' || type === 'modifier', 'Invalid function type.';        

        let baseFileName = entityName + '-' + functionCall.name + '.js';

        let filePath = path.resolve(
            this.buildPath,
            dbService.dbType,
            dbService.name,
            type === 'validator' ? 'validators' : 'modifiers',
            baseFileName
        );

        if (fs.existsSync(filePath)) {
            //todo: analyse code
            this.logger.log('info', `${ type === 'validator' ? 'Validator' : 'Modifier' } "${baseFileName}" exists. File generating skipped.`);

            return baseFileName;
        }

        let params = [ fieldName ];

        if (!_.isEmpty(functionCall.args)) {

            _.each(functionCall.args, p => {
                let name;

                if (p.oolType === 'ValueWithModifier') {
                    if (_.isPlainObject(p.value)) {
                        name = DaoModeler._extractReferenceBaseName(p.value);
                    }
                } else if (_.isPlainObject(p)) {
                    name = DaoModeler._extractReferenceBaseName(p);
                } else {
                    name = 'param' + params.length + 1;
                }

                if (params.indexOf(name) !== -1) {
                    throw new Error('Conflict: duplicate parameter name: ' + name);
                }

                if (name) params.push(name);
            });
        }

        let ast = JsLang.astProgram();
        JsLang.astPushInBody(ast, JsLang.astRequire('Mowa', 'mowa'));
        JsLang.astPushInBody(ast, JsLang.astFunction(functionCall.name, _.map(params, p => JsLang.astId(p)), type === 'validator' ? [ JsLang.astReturn(true) ] : [ JsLang.astReturn(JsLang.astId(fieldName)) ]));
        JsLang.astPushInBody(ast, JsLang.astAssign('module.exports', JsLang.astVarRef(functionCall.name)));

        DaoModeler._exportSourceCode(ast, filePath);
        this.logger.log('info', `Generated ${ type } file: ${filePath}`);

        return baseFileName;
    }

    _processValidators(dbService, entity, stage, mapValidatorToFile, mapModifierToFile, mapTopoIdToAst, tsort, trie) {
        let key = 'validators' + stage.toString();

        _.forOwn(entity.fields, (field, fieldName) => {
            if (_.isEmpty(field[key])) return;

            let lastTopoId, astOfThis;
            let astCallValidators, astBlock = [];

            if (stage > 0) {
                lastTopoId = fieldName + ':' + (stage-1).toString();
            }

            _.each(field[key], (validator, i) => {
                if (validator.args) {
                    Array.isArray(validator.args) || (validator.args = [validator.args]);
                }

                let topoId = this._processValidator(
                    validator,
                    dbService,
                    entity.name,
                    fieldName,
                    mapValidatorToFile,
                    mapModifierToFile,
                    stage,
                    mapTopoIdToAst,
                    tsort,
                    i,
                    trie
                );

                astOfThis = mapTopoIdToAst[topoId];

                if (i > 0) {
                    astCallValidators = JsLang.astBinExp(astCallValidators, '&&', astOfThis);
                }

                if (lastTopoId) {
                    DaoModeler._addDependency(tsort, trie, topoId, lastTopoId);
                }

                lastTopoId = topoId;
            });

            if (!astCallValidators) {
                astCallValidators = astOfThis;
            }

            delete field[key];
            let stageFinish = fieldName + ':' + stage.toString();
            let validatedStatusKey = stageFinish + ':validated';
            DaoModeler._addDependency(tsort, trie, validatedStatusKey, lastTopoId);
            DaoModeler._addDependency(tsort, trie, stageFinish, validatedStatusKey);
            DaoModeler._addDependency(tsort, trie, '@latest.' + fieldName, stageFinish);

            let validatedVar = 'valid' + _.upperFirst(fieldName);
            astBlock.push(JsLang.astVarDeclare(validatedVar, astCallValidators));
            astBlock.push(Snippets._preCreateValidateCheck(validatedVar, fieldName));

            mapTopoIdToAst[validatedStatusKey] = astBlock;
        });
    }

    _processValidator(validator, dbService, entityName, fieldName, mapValidatorToFile, mapModifierToFile, stage, mapTopoIdToAst, tsort, index, trie) {
        let validatorId = this._extractAndGenerateFunctor(validator, 'validator', mapValidatorToFile, dbService, entityName, fieldName);

        let topoId = fieldName + ':' + stage + '~' + index + '>' + validatorId;

        //extract dependencies information
        let args = this._extractDependencies(validator, topoId, dbService, entityName, mapModifierToFile, mapTopoIdToAst, tsort, trie);

        mapTopoIdToAst[topoId] = JsLang.astCall(validatorId, [JsLang.astVarRef('latest.' + fieldName)].concat(args));

        return topoId;
    };

    _extractAndGenerateFunctor(functor, functorType, mapFunctorToFile, dbService, entityName, fieldName) {
        let functorBaseName, functorJsFile, functorId;

        //extract validator naming and import information
        if (OolUtil.isMemberAccess(functor.name)) {
            let names = OolUtil.extractMemberAccess(functor.name);
            if (names.length > 2) {
                throw new Error('Not supported reference type: ' + functor.name);
            }

            //reference to other entity file
            let refEntityName = names[0];
            functorBaseName = names[1];
            functorJsFile = refEntityName + '-' + functorBaseName + '.js';
            functorId = refEntityName + _.upperFirst(functorBaseName);
            if (mapFunctorToFile[functorId] && mapFunctorToFile[functorId] !== functorJsFile) {
                throw new Error(`Conflict: External ${functorType} naming conflict "${functorId}"!`);
            }
            mapFunctorToFile[functorId] = functorJsFile;
        } else {
            functorBaseName = functor.name;

            let builtins = functorType === 'validator' ? OolongValidators : OolongModifiers;

            if (!(functorBaseName in builtins)) {
                functorJsFile = this._generateFunctionTemplateFile(functor, dbService, entityName, fieldName, functorType);

                //not a builtin validator, generate the validator file template
                if (mapFunctorToFile[functorBaseName] && mapFunctorToFile[functorBaseName] !== functorJsFile) {
                    throw new Error(`Conflict: Internal ${functorType} naming conflict "${functorBaseName}"!`);
                }

                mapFunctorToFile[functorBaseName] = functorJsFile;
                functorId = functorBaseName;
            } else {
                functorId = functorType + 's.' + functorBaseName;
            }
        }

        return functorId;
    };

    //extract dependencies information from arguments and return a array of param in AST form
    _extractDependencies(functionCall, topoId, dbService, entityName, mapModifierToFile, mapTopoIdToAst, tsort, trie) {
        if (!_.isEmpty(functionCall.args)) {
            let params = [];

            _.each(functionCall.args, (arg, i) => {
                if (_.isPlainObject(arg)) {

                    if (arg.oolType === 'ObjectReference') {
                        //'latest.' + fieldName depends on arg.name
                        DaoModeler._addDependency(tsort, trie, topoId, '@' + arg.name);
                        params.push(JsLang.astVarRef(arg.name));

                    } else if (arg.oolType === 'ValueWithModifiers') {
                        //like <value> | modifier

                        let lastTopoId, fieldName, astValue;

                        if (_.isPlainObject(arg.value)) {
                            fieldName = DaoModeler._extractReferenceBaseName(arg.value);

                            if (arg.value.oolType === 'ObjectReference') {
                                //'latest.' + fieldName depends on arg.name
                                lastTopoId = '@' + arg.value.name;
                                DaoModeler._addDependency(tsort, trie, topoId, lastTopoId);
                                astValue = JsLang.astVarRef(arg.value.name);
                            } else {
                                fieldName = 'value';
                                astValue = JsLang.astValue(arg.value);
                            }
                        } else {
                            fieldName = 'value';
                            astValue = JsLang.astValue(arg.value);
                        }

                        let modifiersFinished = this._processValueModifiers(dbService, arg, entityName, fieldName,
                            0, mapModifierToFile, lastTopoId, topoId + '$' + (i+1).toString(), mapTopoIdToAst, tsort, trie, astValue);

                        let astOfThis = mapTopoIdToAst[modifiersFinished];
                        if (astOfThis) {
                            params.push(astOfThis);
                        }

                        if (modifiersFinished) {
                            DaoModeler._addDependency(tsort, trie, topoId, modifiersFinished);
                        }
                    }
                } else {
                    params.push(JsLang.astValue(arg));
                }
            });

            return params;
        }

        return [];
    };

    _processValueModifiers(dbService, varMeta, entityName, fieldName, stage,
                           mapModifierToFile, dependsOnTopoId, topoIdPrefix, mapTopoIdToAst, tsort, trie, astValue) {
        let key = 'modifiers' + stage.toString();
        if (_.isEmpty(varMeta[key])) return;

        let lastTopoId = dependsOnTopoId;
        let ast = [], lastAstValue = astValue;

        _.each(varMeta[key], (modifier, i) => {
            if (modifier.args) {
                Array.isArray(modifier.args) || (modifier.args = [modifier.args]);
            }

            let topoId = this._processModifier(
                modifier,
                dbService,
                entityName,
                fieldName,
                mapModifierToFile,
                mapTopoIdToAst,
                tsort,
                i,
                topoIdPrefix,
                trie,
                lastAstValue
            );

            lastAstValue = mapTopoIdToAst[topoId];

            if (lastTopoId) {
                DaoModeler._addDependency(tsort, trie, topoId, lastTopoId);
            }

            lastTopoId = topoId;
        });

        delete varMeta[key];

        let finishOfThisStage = topoIdPrefix + ':modified';
        DaoModeler._addDependency(tsort, trie, finishOfThisStage, lastTopoId);

        if (varMeta instanceof OolongField) {
            mapTopoIdToAst[finishOfThisStage] = JsLang.astAssign(astValue, lastAstValue);
        } else {
            mapTopoIdToAst[finishOfThisStage] = lastAstValue;
        }

        return finishOfThisStage;
    }

    _processModifiers(dbService, entity, stage, mapModifierToFile, mapTopoIdToAst, tsort, trie) {
        _.forOwn(entity.fields, (field, fieldName) => {
            let topoIdPrefix = fieldName + ':' + stage.toString();
            let dependsOnTopoId = topoIdPrefix + ':validated';

            let finishOfThisStage = this._processValueModifiers(dbService, field, entity.name, fieldName,
                stage, mapModifierToFile, trie.lookup(dependsOnTopoId) ? dependsOnTopoId : undefined, topoIdPrefix, mapTopoIdToAst, tsort, trie,
                JsLang.astVarRef('latest.' + fieldName)
            );

            if (finishOfThisStage) {
                DaoModeler._addDependency(tsort, trie, topoIdPrefix, finishOfThisStage);
                DaoModeler._addDependency(tsort, trie, '@latest.' + fieldName, topoIdPrefix);
            }
        });
    }

    _processModifier(modifier, dbService, entityName, fieldName, mapModifierToFile, mapTopoIdToAst, tsort, index, topoIdPrefix, trie, astValue) {
        let modifierId = this._extractAndGenerateFunctor(modifier, 'modifier', mapModifierToFile, dbService, entityName, fieldName);

        let topoId = topoIdPrefix + '|' + index + '>' + modifierId;

        //extract dependencies information
        let args = this._extractDependencies(modifier, topoId, dbService, entityName, mapModifierToFile, mapTopoIdToAst, tsort, trie);

        mapTopoIdToAst[topoId] = JsLang.astCall(modifierId, [astValue].concat(args));

        return topoId;
    }

    _buildInterfaces(entity, dbService, modelMetaInit) {
        let ast = [];

        _.forOwn(entity.interfaces, (method, name) => {
            let compileContext = {
                entityName: entity.name,
                dbServiceId: dbService.serviceId,
                topoSort: Util.createTopoSort(),
                astMap: {},
                includes: new Set(),
                refDependencies: {},
                modelVars: new Set(),
                astBody: [
                    JsLang.astVarDeclare('$meta', JsLang.astVarRef('this.meta.interfaces.' + name), true)
                ],
                mapOfFunctorToFile: {},
                newFunctorFiles: []
            };

            //scan all used models in advance
            _.each(method.implementation, (operation) => {
                compileContext.modelVars.add(operation.model);
            });

            let lastOpTopoId = '$op:start';
            let returnTopoId = '$return';
            
            let params = [], paramMeta = [];

            if (method.accept) {
                method.accept.forEach((param, i) => {
                    let topoId = OolToAst.translateParam(i, param, compileContext);
                    compileContext.topoSort.add(topoId, returnTopoId);
                    compileContext.topoSort.add(param.name, lastOpTopoId);

                    params.push(param.name);
                    paramMeta[i] = _.omit(param, [ 'validators0', 'modifiers0', 'validators1', 'modifiers1' ]);
                });
            }

            modelMetaInit['interfaces'] || (modelMetaInit['interfaces'] = {});
            modelMetaInit['interfaces'][name] = { params: paramMeta };

            _.each(method.implementation, (operation, index) => {
                let topoId = OolToAst.translateDbOperation(index, operation, compileContext);
                compileContext.topoSort.add(lastOpTopoId, [topoId]);
                lastOpTopoId = topoId;
                compileContext.topoSort.add(lastOpTopoId, returnTopoId);
                compileContext.includes.add(topoId);
            });

            if (method.return) {
                OolToAst.translateReturn(returnTopoId, method.return, compileContext);
                compileContext.includes.add(returnTopoId);
            }

            let deps = compileContext.topoSort.sort();

            //console.log(deps);

            _.each(deps, dep => {
                if (compileContext.includes.has(dep)) {
                    //console.log(dep);
                    //console.dir(compileContext.astMap[dep], {depth: 10, colors: true});
                    //console.log('---------------------------------------------------------');

                    compileContext.astBody = compileContext.astBody.concat(_.castArray(compileContext.astMap[dep]));
                }
            });

            //compileContext.astBody = compileContext.astBody.concat(_.castArray(compileContext.astMap[dep]));
            
            ast.push(JsLang.astMethod(name, params, compileContext.astBody, true, false, true));
        });

        return ast;
    };

    static _exportSourceCode(ast, modelFilePath) {
        let content = escodegen.generate(ast, {
            format: {
                indent: {
                    style: '    ',
                    base: 0,
                    adjustMultilineComment: false
                },
                newline: '\n',
                space: ' ',
                json: false,
                renumber: false,
                hexadecimal: false,
                quotes: 'single',
                escapeless: false,
                compact: false,
                parentheses: true,
                semicolons: true,
                safeConcatenation: false
            },
            comment: true
        });

        fs.ensureFileSync(modelFilePath);
        fs.writeFileSync(modelFilePath, content);
    }

    static _extractReferenceBaseName(p) {
        pre: _.isPlainObject(p), 'p should be a plain object.';

        if (p.oolType === 'ObjectReference') {
            if (OolUtil.isMemberAccess(p.name)) {
                return OolUtil.extractMemberAccess(p.name).pop();
            }
        }

        return p.name;
    };

    static _addDependency(tsort, trie, id, dependsOnId) {
        tsort.add(dependsOnId, [id]);
        trie.addWord(id);
    }   

}

module.exports = DaoModeler;