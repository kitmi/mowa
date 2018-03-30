"use strict";

/**
 * @module
 * @ignore
 */

const Util = require('../../../util.js');
const _ = Util._;
const JsLang = require('./ast.js');
const OolUtil = require('../../lang/ool-utils.js');
const OolongModifiers = require('../../runtime/modifiers.js');
const OolongValidators = require('../../runtime/validators.js');
const Types = require('../../runtime/types.js');

const errorMapping = {
    invalid_request: ''  
};

const defaultError = 'InvalidRequest';

/**
 * Translate a conditional expression
 * @param {object} test
 * @param {object} compileContext
 * @property {string} compileContext.entityName
 * @property {TopoSort} compileContext.topoSort
 * @property {object} compileContext.astMap - Topo Id to ast map
 * @param {object} topoInfo
 * @property {string} topoInfo.topoIdPrefix
 * @returns {string} Topo Id
 */
function translateTest(test, compileContext, topoInfo) {
    let { topoIdPrefix } = topoInfo;

    if (_.isPlainObject(test)) {
        if (test.oolType === 'BinaryExpression') {
            let topoId = topoIdPrefix + '$binOp';

            let op;

            switch (test.operator) {
                case '>':
                case '<':
                case '>=':
                case '<=':
                case 'in':
                    op = test.operator;
                    break;

                case 'and':
                    op = '&&';
                    break;

                case 'or':
                    op = '||';
                    break;

                case '=':
                    op = '===';
                    break;

                case '!=':
                    op = '!==';
                    break;

                default:
                    throw new Error('Unsupported test operator: ' + test.operator);
            }

            let lastLeftId = translateTest(test.left, compileContext, { topoIdPrefix: topoIdPrefix + '$left' });
            let lastRightId = translateTest(test.right, compileContext, { topoIdPrefix: topoIdPrefix + '$right' });
            compileContext.topoSort.add(lastLeftId, topoId);
            compileContext.topoSort.add(lastRightId, topoId);

            compileContext.astMap[topoId] = {
                "type": "BinaryExpression",
                "operator": op,
                "left": compileContext.astMap[lastLeftId],
                "right": compileContext.astMap[lastRightId]
            };

            return topoId;

        } else if (test.oolType === 'UnaryExpression') {
            let topoId = topoIdPrefix + '$unaOp';

            let argTopoId = translateTest(test.argument, compileContext, { topoIdPrefix: topoIdPrefix + '$$' });
            compileContext.topoSort.add(argTopoId, topoId);

            let astArgument = compileContext.astMap[argTopoId];

            switch (test.operator) {
                case 'exists':
                    compileContext.astMap[topoId] = JsLang.astNot(JsLang.astCall('_.isEmpty', astArgument));
                    break;

                case 'is-not-null':
                    compileContext.astMap[topoId] = JsLang.astNot(JsLang.astCall('_.isNil', astArgument));
                    break;

                case 'not-exists':
                    compileContext.astMap[topoId] = JsLang.astCall('_.isEmpty', astArgument);
                    break;

                case 'is-null':
                    compileContext.astMap[topoId] = JsLang.astCall('_.isNil', astArgument);
                    break;

                case 'not':
                    compileContext.astMap[topoId] = JsLang.astNot(astArgument);
                    break;

                default:
                    throw new Error('Unsupported test operator: ' + test.operator);
            }

            return topoId;

        } else if (test.oolType === 'ComputedValue') {
            if (_.isPlainObject(test.value)) {
                let value = Object.assign({}, test.value, _.omit(test, [ 'oolType' ]));
                return translateVariable(topoIdPrefix, value, compileContext, OolUtil.extractMemberAccess(value.name)[0]);
            }

            return translateConcreteValue(topoIdPrefix, test, compileContext);
        } else if (test.oolType === 'ObjectReference') {
            let valueTopoId = translateVariable(topoIdPrefix, test, compileContext, OolUtil.extractMemberAccess(test.name)[0]);
            if (valueTopoId !== topoIdPrefix) {
                compileContext.topoSort.add(valueTopoId, topoIdPrefix);
            }
            return valueTopoId;
        } else {
            throw new Error('Unknown ool node: ' + JSON.stringify(test));
        }
    }

    let topoId = topoIdPrefix + '$value';
    compileContext.astMap[topoId] = JsLang.astValue(test);
    return topoId;
}

function validatorReducer(value, validators, compileContext, topoInfo) {
    let l = validators.length;
    let lastTopoId = topoInfo.lastTopoId, astCallValidators, astOfThis;

    for (let i = 0; i < l; i++) {
        let validator = validators[i];
        let declareParams = translateFunctionParams([value].concat(validator.args));

        let validatorId = translateFunctor(validator, OolUtil.FUNCTOR_VALIDATOR, compileContext, declareParams);
        let topoId = topoInfo.topoIdPrefix + '~[' + i.toString() + ']' + validatorId;

        let callArgs = validator.args ? translateArgs(topoId, validator.args, compileContext) : [];
        astOfThis = JsLang.astCall(validatorId, [ value ].concat(callArgs));

        if (lastTopoId) {
            compileContext.topoSort.add(lastTopoId, topoId);
        }

        if (i > 0) {
            astCallValidators = JsLang.astBinExp(astCallValidators, '&&', astOfThis);
        } else {
            astCallValidators = astOfThis;
        }

        lastTopoId = topoId;
    }

    let validatedTopoId = topoInfo.topoIdPrefix + ':validated';

    compileContext.topoSort.add(lastTopoId, validatedTopoId);
    compileContext.astMap[validatedTopoId] = astCallValidators;

    return validatedTopoId;
}

function modifierReducer(value, modifiers, compileContext, topoInfo) {
    let l = modifiers.length;
    let lastTopoId = topoInfo.lastTopoId;

    for (let i = 0; i < l; i++) {
        let modifier = modifiers[i];
        let declareParams = translateFunctionParams([value].concat(modifier.args));

        let modifierId = translateFunctor(modifier, OolUtil.FUNCTOR_MODIFIER, compileContext, declareParams);
        let topoId = topoInfo.topoIdPrefix + '|[' + i.toString() + ']' + modifierId;

        if (lastTopoId) {
            compileContext.topoSort.add(lastTopoId, topoId);
        }

        let callArgs = modifier.args ? translateArgs(topoId, modifier.args, compileContext) : [];

        compileContext.astMap[topoId] = JsLang.astAssign(JsLang.astVarRef(value), JsLang.astCall(modifierId, [ value ].concat(callArgs)));

        lastTopoId = topoId;
    }

    return lastTopoId;
}

function addFunctorToMap(functorId, functorType, functorJsFile, mapOfFunctorToFile) {
    if (mapOfFunctorToFile[functorId] && mapOfFunctorToFile[functorId] !== functorJsFile) {
        throw new Error(`Conflict: ${functorType} naming "${functorId}" conflicts!`);
    }
    mapOfFunctorToFile[functorId] = functorJsFile;
}

function translateFunctor(functor, functorType, compileContext, args) {
    let functionName, fileName, functorId;

    //extract validator naming and import information
    if (OolUtil.isMemberAccess(functor.name)) {
        let names = OolUtil.extractMemberAccess(functor.name);
        if (names.length > 2) {
            throw new Error('Not supported reference type: ' + functor.name);
        }

        //reference to other entity file
        let refEntityName = names[0];
        functionName = names[1];
        fileName = refEntityName + '-' + functionName + '.js';
        functorId = refEntityName + _.upperFirst(functionName);
        addFunctorToMap(functorId, functorType, fileName, compileContext.mapOfFunctorToFile);

    } else {
        functionName = functor.name;

        let builtins;

        switch (functorType) {
            case OolUtil.FUNCTOR_VALIDATOR:
                builtins = OolongValidators;
                break;
            
            case OolUtil.FUNCTOR_MODIFIER:
                builtins = OolongModifiers;
                break;

            case OolUtil.FUNCTOR_FUNCTION:
                builtins = {};
                break;
        }

        if (!(functionName in builtins)) {
            fileName = compileContext.entityName + '-' + functionName + '.js';
            functorId = functionName;
            addFunctorToMap(functorId, functorType, fileName, compileContext.mapOfFunctorToFile);

            compileContext.newFunctorFiles.push({
                functionName,
                functorType,
                fileName,
                args
            });
        } else {
            functorId = functorType + 's.' + functionName;
        }
    }

    return functorId;
}

/**
 * Translate a variable with validators and modifiers
 * @param {string} topoId
 * @param {object} varOol
 * @param {object} compileContext
 * @property {string} compileContext.entityName
 * @property {TopoSort} compileContext.topoSort
 * @property {object} compileContext.astMap - Topo Id to ast map
 * @param {string} dependedTopoId
 * @returns {string} Last topo Id
 */
function translateVariable(topoId, varOol, compileContext, dependedTopoId) {
    pre: _.isPlainObject(varOol) && (varOol.oolType === 'ObjectReference' || 'value' in varOol), Util.Message.DBC_INVALID_ARG;

    let lastTopoId = dependedTopoId;
    let ast = [];
    let value;

    if (varOol.oolType === 'ObjectReference') {
        let [ baseName, others ] = varOol.name.split('.', 2);
        if (compileContext.modelVars.has(baseName) && others) {
            varOol.name = baseName + '.data' + '.' + others;
        }
        value = varOol;
    } else {
        value = varOol.value;
    }

    if (varOol.validators0) {
        lastTopoId = validatorReducer(value, varOol.validators0, compileContext, { topoIdPrefix: topoId + ':s0', lastTopoId });
        ast.push(JsLang.astAssign('$' + topoId, compileContext.astMap[lastTopoId]));
        delete varOol.validators0;
    }

    if (varOol.modifiers0) {
        lastTopoId = modifierReducer(value, varOol.modifiers0, compileContext, { topoIdPrefix: topoId + ':s0', lastTopoId });
        ast = ast.concat(_.castArray(compileContext.astMap[lastTopoId]));
        delete varOol.modifiers0;
    }

    if (varOol.validators1) {
        lastTopoId = validatorReducer(value, varOol.validators1, compileContext, { topoIdPrefix: topoId + ':s1', lastTopoId });
        ast.push(JsLang.astAssign('$' + topoId, compileContext.astMap[lastTopoId]));
        delete varOol.validators1;
    }

    if (varOol.modifiers1) {
        lastTopoId = modifierReducer(value, varOol.modifiers1, compileContext, { topoIdPrefix: topoId + ':s1', lastTopoId });
        ast = ast.concat(_.castArray(compileContext.astMap[lastTopoId]));
        delete varOol.modifiers1;
    }

    if (lastTopoId && lastTopoId !== dependedTopoId) {
        let replaceTopoId = topoId + ':ready';
        compileContext.topoSort.add(lastTopoId, replaceTopoId);
        compileContext.refDependencies[topoId] = replaceTopoId;
        topoId = replaceTopoId;

    } else if (dependedTopoId && topoId !== dependedTopoId) {
        if (compileContext.refDependencies[dependedTopoId]) {
            compileContext.topoSort.add(compileContext.refDependencies[dependedTopoId], topoId);
        } else {
            compileContext.topoSort.add(dependedTopoId, topoId);
        }
    }

    compileContext.astMap[topoId] = _.isEmpty(ast) ? JsLang.astValue(value) : ast;

    return topoId;
}

function translateFunctionParams(args) {
    if (_.isEmpty(args)) return [];

    return _.map(args, (arg, i) => {
        if (_.isPlainObject(arg) && arg.oolType === 'ObjectReference') {
            if (OolUtil.isMemberAccess(arg.name)) {
                return OolUtil.extractMemberAccess(arg.name).pop;
            }

            return arg.name;
        }

        return 'param' + (i + 1).toString();
    });
}

function translateConcreteValue(topoId, value, compileContext) {
    if (_.isPlainObject(value)) {
        if (value.oolType === 'ObjectReference' || 'value' in  value) {
            return translateVariable(topoId, value, compileContext, OolUtil.extractMemberAccess(value.name)[0]);
        }
    }

    compileContext.astMap[topoId] = JsLang.astValue(value);
    return topoId;
}

//extract dependencies information from arguments and return a array of arguments in AST form
function translateArgs(topoId, args, compileContext) {
    args = _.castArray(args);
    if (_.isEmpty(args)) return [];

    let callArgs = [];

    _.each(args, (arg, i) => {
        let argTopoId = topoId + ':arg-' + (i+1).toString();
        let lastTopoId = translateConcreteValue(argTopoId, arg, compileContext);

        compileContext.topoSort.add(lastTopoId, topoId);

        callArgs.push(compileContext.astMap[lastTopoId]);
    });

    return callArgs;
}

function translateParam(index, param, compileContext) {
    let topoId = param.name;
    let type = param.type;

    let sanitizerName;

    switch (type) {
        case Types.TYPE_INT:
            sanitizerName = 'validators.$processInt';
            break;
        case Types.TYPE_FLOAT:
            sanitizerName = 'validators.$processFloat';
            break;
        case Types.TYPE_BOOL:
            sanitizerName = 'validators.$processBool';
            break;
        case Types.TYPE_TEXT:
            sanitizerName = 'validators.$processText';
            break;
        case Types.TYPE_BINARY:
            sanitizerName = 'validators.$processBinary';
            break;
        case Types.TYPE_DATETIME:
            sanitizerName = 'validators.$processDatetime';
            break;
        case Types.TYPE_JSON:
            sanitizerName = 'validators.$processJson';
            break;
        case Types.TYPE_XML:
            sanitizerName = 'validators.$processXml';
            break;
        case Types.TYPE_ENUM:
            sanitizerName = 'validators.$processEnum';
            break;
        case Types.TYPE_CSV:
            sanitizerName = 'validators.$processCsv';
            break;
        default:
            throw new Error('Unknown field type: ' + type);
    }

    if (index === 0) {
        compileContext.astBody.push(JsLang.astVarDeclare(JsLang.astVarRef('$sanitizeState'),
            JsLang.astCall(sanitizerName, [ JsLang.astArrayAccess('$meta.params', index), JsLang.astVarRef(param.name) ]))
        );
    } else {
        compileContext.astBody.push(JsLang.astAssign(JsLang.astVarRef('$sanitizeState'),
            JsLang.astCall(sanitizerName, [ JsLang.astArrayAccess('$meta.params', index), JsLang.astVarRef(param.name) ]))
        );
    }

    compileContext.astBody.push(JsLang.astIf(JsLang.astVarRef('$sanitizeState.error'),
        JsLang.astReturn(JsLang.astVarRef('$sanitizeState')))
    );

    compileContext.astBody.push(JsLang.astAssign(JsLang.astVarRef(param.name),
        JsLang.astVarRef('$sanitizeState.sanitized'))
    );

    compileContext.astMap[topoId] = JsLang.astVarRef(param.name);

    let value = Object.assign({ oolType: 'ObjectReference', name: param.name },
        _.pick(param, [ 'validators0', 'modifiers0', 'validators1', 'modifiers1' ]));
    let paramTopoId = translateVariable(topoId, value, compileContext, topoId);

    if (paramTopoId !== topoId) {
        compileContext.includes.add(paramTopoId);
    }

    return paramTopoId;
}

function translateThenAst(topoId, then, compileContext, assignTo) {
    if (_.isPlainObject(then)) {
        if (then.oolType === 'ThrowExpression') {
            return JsLang.astThrow(then.errorType || defaultError, then.message || []);
        }

        if (then.oolType === 'ReturnExpression') {
            return translateReturnValueAst(topoId, then.value, compileContext);
        }
    }

    if (!assignTo) {
        return JsLang.astReturn(then);
    }

    return JsLang.astAssign(assignTo, then);
}

function translateFindOne(index, operation, compileContext) {
    let topoId = 'op$' + index.toString();
    let conditionVarName = topoId + '$condition';

    let ast = [
        JsLang.astVarDeclare(conditionVarName)
    ];

    if (operation.case) {
        let topoIdPrefix = topoId + '$cases';
        let lastStatement;
        if (operation.case.else) {
            lastStatement = translateThenAst(topoIdPrefix + '$else', operation.case.else, compileContext, conditionVarName);
        } else {
            lastStatement = JsLang.astThrow('ServerError', 'Unexpected state.');
        }

        if (!operation.case.items) {
            throw new Error('Missing case items');
        }

        _.reverse(operation.case.items).forEach((item, i) => {
            if (item.oolType !== 'ConditionalStatement') {
                throw new Error('Invalid case item.');
            }

            let caseTopoId = topoIdPrefix + '$' + i.toString();
            let caseResultVarName = '$' + caseTopoId;
            ast.push(JsLang.astVarDeclare(caseResultVarName, false));

            let lastTopoId = translateTest(item.test, compileContext, { topoIdPrefix: caseTopoId });
            ast = ast.concat(_.castArray(compileContext.astMap[lastTopoId]));

            lastStatement = JsLang.astIf(JsLang.astVarRef(caseResultVarName), JsLang.astBlock(translateThenAst(topoIdPrefix + '$then', item.then, compileContext, conditionVarName)), lastStatement);
            compileContext.topoSort.add(lastTopoId, topoId);
        });

        ast = ast.concat(_.castArray(lastStatement));
    }

    ast.push(
        JsLang.astVarDeclare(operation.model, JsLang.astAwait(`this.findOne`, JsLang.astVarRef(conditionVarName)))
    );

    compileContext.topoSort.add(topoId, operation.model);
    compileContext.astMap[topoId] = ast;
    return topoId;
}

function translateDbOperation(index, operation, compileContext) {
    switch (operation.oolType) {
        case 'findOne':
            return translateFindOne(index, operation, compileContext);

        case 'find':
            //prepareDbConnection(compileContext);
            break;

        case 'update':
            //prepareDbConnection(compileContext);
            break;

        case 'create':
            //prepareDbConnection(compileContext);
            break;

        case 'delete':
            //prepareDbConnection(compileContext);
            break;

        case 'javascript':
            break;

        case 'assignment':
            break;

        default:
            throw new Error('Unsupported operation type: ' + operation.type);
    }
}

function translateReturnValueAst(topoId, value, compileContext) {
    let valueTopoId = translateConcreteValue(topoId, value, compileContext);
    return JsLang.astReturn(compileContext.astMap[valueTopoId]);
}

function translateExceptionalReturn(topoId, oolNode, compileContext) {
    pre: (_.isPlainObject(oolNode) && oolNode.oolType === 'ReturnExpression'), Util.Message.DBC_INVALID_ARG;

    let topoIdPrefix = topoId + '$exceptions';

    if (!_.isEmpty(oolNode.exceptions)) {
        oolNode.exceptions.forEach((item, i) => {
            if (_.isPlainObject(item)) {
                if (item.oolType !== 'ConditionalStatement') {
                    throw new Error('Unsupported exceptional type: ' + item.oolType);
                }

                let exceptionTopoId = topoIdPrefix + '-' + i.toString();
                let lastTopoId = translateTest(item.test, compileContext, { topoIdPrefix: exceptionTopoId });
                compileContext.astMap[lastTopoId] = JsLang.astIf(compileContext.astMap[lastTopoId], JsLang.astBlock(translateThenAst(exceptionTopoId + '$then', item.then, compileContext)));
                compileContext.includes.add(lastTopoId);
            }
        });
    }

    compileContext.astMap[topoId] = translateReturnValueAst(topoId, oolNode.value, compileContext);
    return topoId;
}

module.exports = {
    translateTest,
    translateVariable,
    translateParam,
    translateDbOperation,
    translateExceptionalReturn
};