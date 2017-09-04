"use strict";

const _ = require('lodash');

function astProgram(body, strict = true) {
    return {
        "type": "Program",
        "body": strict ? [astExpression(astValue('use strict'))].concat(body) : body,
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
                "init": astCallInline('require', [ astValue(requirePath) ])
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
                "init": right
            }
        ],
        "kind": isConstant ? "const" : "let"
    };
}

function astIf(test, consequent, alternate) {
    return {
        "type": "IfStatement",
        "test": test,
        "consequent": Array.isArray(consequent) ? {
            "type": "BlockStatement",
            "body": consequent
        } : consequent,
        "alternate": Array.isArray(alternate) ? {
            "type": "BlockStatement",
            "body": alternate
        } : alternate
    };
}

function astBinExp(left, operator, right) {
    return {
        "type": "BinaryExpression",
        "operator": operator,
        "left": left,
        "right": right
    }
}

function astCall(functionName, args) {
    return {
        "type": "ExpressionStatement",
        "expression": astCallInline(functionName, args)
    };
}

function astCallInline(functionName, args) {
    return {
        "type": "CallExpression",
        "callee": _.isPlainObject(functionName) ? functionName : astVarRef(functionName),
        "arguments": Array.isArray(args) ? args : [args]
    };
}

function astYield(target, delegate = false) {
    return {
        "type": "YieldExpression",
        "argument": target,
        "delegate": delegate
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
    return {
        "type": "Identifier",
        "name": name
    };
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

        throw new Error('Unrecognized object: ' + JSON.stringify(value));
    }

    return {
        "type": "Literal",
        "value": value,
        "raw": JSON.stringify(value)
    };
}

function astAddMember(obj, member) {
    obj.properties.push(member);
}

function astAddBodyExpression(obj, expr) {
    if (Array.isArray(obj.body)) {
        obj.body.push(expr);
    } else {
        obj.body.body.push(expr);
    }
}

function astFunction(name, args, body, generator = false) {
    return {
        "type": "FunctionDeclaration",
        "id": astId(name),
        "generator": generator,
        "expression": false,
        "defaults": [],
        "params": args,
        "body": astBlock(body)
    };
}

function astAnonymousFunction(args, body, generator = false) {
    return {
        "type": "FunctionExpression",
        "id": null,
        "params": args,
        "defaults": [],
        "body": {
            "type": "BlockStatement",
            "body": body
        },
        "generator": generator,
        "expression": false
    };
}

function astArrowFunction(args, body, generator = false) {
    return {
        "type": "ArrowFunctionExpression",
        "id": null,
        "params": args,
        "body": body,
        "generator": generator,
        "expression": true
    }
}

function astBlock(body) {
    return {
        "type": "BlockStatement",
        "body": body
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
            "arguments": args
        }
    };
}

function astNot(expr) {
    return {
        "type": "UnaryExpression",
        "operator": "!",
        "argument": expr,
        "prefix": true
    };
}

function astReturn(val) {
    return {
        "type": "ReturnStatement",
        "argument": val
    };
}

module.exports = {
    astProgram,
    astRequire,
    astDeclare,
    astCall,
    astCallInline,
    astYield,
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
    astAddBodyExpression,
    astThrow,
    astNot,
    astReturn
};