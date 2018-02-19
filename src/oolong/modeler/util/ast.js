"use strict";

const Util = require('../../../util.js');
const _ = Util._;

/**
 * @module AST
 * @summary Abstract syntax tree of JavaScript
 */

const AST_OBJECT_TYPES = [
    'ThisExpression',
    'MemberExpression',
    'BinaryExpression',
    'ArrowFunctionExpression',
    'FunctionExpression',
    'ArrayExpression',
    'ObjectExpression',
    'CallExpression',
    'YieldExpression',
    'AwaitExpression',
    'Literal',
    'Identifier'
];

function mapParams(params) {
    params = Array.isArray(params) ? params : [ params ];

    return params.map(p => {
         if (typeof p === 'string') {
             return astId(p);
         }

        if (_.isPlainObject(p) && p.type === 'Identifier') {
            return p;
        }

        throw new Error('Invalid param: ' + JSON.stringify(p));
    });
}

function mapArgs(args) {
    args = Array.isArray(args) ? args : [ args ];

    return args.map(a => {
        if (_.isPlainObject(a) && 'type' in args) {
            return a;
        }

        return astValue(a);
    });
}

function mapBody(body) {
    if (Array.isArray(body)) {
        return astBlock(body);
    }
    
    if (_.isPlainObject(body) && 'type' in body) {
        return body;
    }

    return astValue(body);
}

function astProgram(strict = true) {
    return {
        "type": "Program",
        "body": strict ? [astExpression(astValue('use strict'))] : [],
        "sourceType": "script"
    };
}

function astRequire(varName, requirePath) {
    return {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": astId(varName),
                "init": astCall('require', [ astValue(requirePath) ])
            }
        ],
        "kind": "const"
    };
}

function astDeclare(left, right, isConstant = false) {
    return {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": astId(left),
                "init": astValue(right)
            }
        ],
        "kind": isConstant ? "const" : "let"
    };
}

function astIf(test, consequent, alternate) {
    return {
        "type": "IfStatement",
        "test": test,
        "consequent": mapBody(consequent),
        "alternate": mapBody(alternate)
    };
}

function astBinExp(left, operator, right) {
    return {
        "type": "BinaryExpression",
        "operator": operator,
        "left": astValue(left),
        "right": astValue(right)
    }
}

function astCall(functionName, args) {
    return {
        "type": "CallExpression",
        "callee": _.isPlainObject(functionName) ? functionName : astVarRef(functionName),
        "arguments": mapArgs(args)
    };
}

function astYield(target, delegate = false) {
    return {
        "type": "YieldExpression",
        "argument": target,
        "delegate": delegate
    };
}

function astAwait(functionName, args) {
    return {
        "type": "AwaitExpression",
        "argument": astCall(functionName, args)
    };
}

function astVarRef(name) {    
    let p = name.split('.');
    if (p.length > 1) {
        //p.reverse();
        let result = {
            "type": "MemberExpression",
            "computed": false,
            "property": astId(p.pop())
        };

        let last = result;

        while (p.length > 1) {
            last["object"] = {
                "type": "MemberExpression",
                "computed": false,
                "property": astId(p.pop())
            };

            last = last["object"];
        }

        last["object"] = p[0] === 'this' 
            ? astThis()
            : astId(p[0]);

        return result;
    } else {
        return astId(name);
    }
}

function astThis() {
    return { "type": "ThisExpression" };
}

function astId(name) {
    if (typeof name === 'string') {
        return {
            "type": "Identifier",
            "name": name
        };
    }

    throw new Error('Invalid identifier name: ' + JSON.stringify(name));
}

function astMember(key, any, shorthand = false) {
    return {
        "type": "Property",
        "key": astId(key),
        "computed": false,
        "value": any,
        "kind": "init",
        "method": false,
        "shorthand": shorthand
    };
}

function astValue(value) {
    if (Array.isArray(value)) {
        return {
            "type": "ArrayExpression",
            "elements": _.map(value, e => astValue(e))
        };
    }

    if (_.isPlainObject(value)) {
        if (AST_OBJECT_TYPES.indexOf(value.type) !== -1) {
            return value;
        }

        if (value.type === 'ObjectReference' || value.type === 'Variable') {
            return astVarRef(value.name);
        }

        if (value.type === 'Array') {
            return astValue(value.value);
        }

        if (value.type === 'Object') {
            let props = [];

            _.forOwn(value.value, (any, key) => {
                props.push(astMember(key, astValue(any)));
            });

            return {
                "type": "ObjectExpression",
                "properties": props
            };
        }

        return astValue({type: 'Object', value});
    }

    if (_.isObject(value)) {
        throw new Error('Invalid value: ' + JSON.stringify(value));
    }

    return astLiteral(value);
}

function astLiteral(value) {
    return {
        "type": "Literal",
        "value": value,
        "raw": JSON.stringify(value)
    };
}

function astAddMember(obj, member) {
    obj.properties.push(member);
}

function astPushInBody(obj, expr) {
    if (Array.isArray(obj.body)) {
        obj.body.push(expr);
    } else {
        obj.body.body.push(expr);
    }
}

function astFunction(name, params, body, generator = false, async = false) {
    return {
        "type": "FunctionDeclaration",
        "id": astId(name),
        "generator": generator,
        "expression": false,
        "async": async,
        "defaults": [],
        "params": mapParams(params),
        "body": astBlock(body)
    };
}

function astAnonymousFunction(params, body, generator = false, async = false) {
    return {
        "type": "FunctionExpression",
        "id": null,
        "params": mapParams(params),
        "defaults": [],
        "body": astBlock(body),
        "generator": generator,
        "expression": false,
        "async": async
    };
}

function astArrowFunction(params, body, generator = false, async = false) {
    return {
        "type": "ArrowFunctionExpression",
        "id": null,
        "params": mapParams(params),
        "body": mapBody(body),
        "generator": generator,
        "expression": true,
        "async": async
    }
}

function astBlock(body) {
    return {
        "type": "BlockStatement",
        "body": Array.isArray(body) ? body : [ body ]
    };
}

function astMatchObject(idList, right, isConstant = true) {
    return {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "ObjectPattern",
                    "properties": _.map(idList, id => astMember(id, astId(id), true))
                },
                "init": right
            }
        ],
        "kind": isConstant ? "const" : "let"
    };
}

function astExpression(expr) {
    return {
        "type": "ExpressionStatement",
        "expression": expr
    };
}

function astAssign(left, right) {
    return astExpression({
        "type": "AssignmentExpression",
        "operator": "=",
        "left": astVarRef(left),
        "right": right
    });
}

function astThrow(name, args) {
    return {
        "type": "ThrowStatement",
        "argument": {
            "type": "NewExpression",
            "callee": {
                "type": "Identifier",
                "name": name
            },
            "arguments": mapArgs(args)
        }
    };
}

function astNot(expr) {
    return {
        "type": "UnaryExpression",
        "operator": "!",
        "argument": astValue(expr),
        "prefix": true
    };
}

function astReturn(val) {
    return {
        "type": "ReturnStatement",
        "argument": astValue(val)
    };
}

module.exports = {
    astProgram,
    astRequire,
    astDeclare,    
    astCall,
    astYield,
    astAwait,
    astThis,
    astId,
    astVarRef,
    astValue,
    astFunction,
    astAnonymousFunction,
    astArrowFunction,
    astIf,
    astBinExp,
    astBlock,
    astMatchObject,
    astExpression,
    astAssign,
    astAddMember,
    astMember,
    astPushInBody,
    astThrow,
    astNot,
    astReturn,
    astLiteral
};