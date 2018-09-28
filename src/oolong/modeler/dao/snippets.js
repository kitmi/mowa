"use strict";

const Util = require('../../../util.js');
const _ = Util._;

const _preCreateHeader = [
    {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": "context"
                },
                "init": {
                    "type": "AwaitExpression",
                    "argument": {
                        "type": "CallExpression",
                        "callee": {
                            "type": "MemberExpression",
                            "computed": false,
                            "object": {
                                "type": "Super"
                            },
                            "property": {
                                "type": "Identifier",
                                "name": "_preCreate"
                            }
                        },
                        "arguments": []
                    }
                }
            }
        ],
        "kind": "let"
    },
    {
        "type": "IfStatement",
        "test": {
            "type": "BinaryExpression",
            "operator": ">",
            "left": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": {
                        "type": "Identifier",
                        "name": "context"
                    },
                    "property": {
                        "type": "Identifier",
                        "name": "errors"
                    }
                },
                "property": {
                    "type": "Identifier",
                    "name": "length"
                }
            },
            "right": {
                "type": "Literal",
                "value": 0,
                "raw": "0"
            }
        },
        "consequent": {
            "type": "ReturnStatement",
            "argument": {
                "type": "Identifier",
                "name": "context"
            }
        },
        "alternate": null
    },
    {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "ObjectPattern",
                    "properties": [
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "raw"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "raw"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "latest"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "latest"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "errors"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "errors"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        }
                    ]
                },
                "init": {
                    "type": "Identifier",
                    "name": "context"
                }
            }
        ],
        "kind": "let"
    }];

const _preCreateValidateCheck = (stateVarName, fieldName) => ({
    "type": "IfStatement",
    "test": {
        "type": "UnaryExpression",
        "operator": "!",
        "argument": {
            "type": "Identifier",
            "name": stateVarName
        },
        "prefix": true
    },
    "consequent": {
        "type": "BlockStatement",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {
                    "type": "CallExpression",
                    "callee": {
                        "type": "MemberExpression",
                        "computed": false,
                        "object": {
                            "type": "Identifier",
                            "name": "errors"
                        },
                        "property": {
                            "type": "Identifier",
                            "name": "push"
                        }
                    },
                    "arguments": [
                        {
                            "type": "ObjectExpression",
                            "properties": [
                                {
                                    "type": "Property",
                                    "key": {
                                        "type": "Identifier",
                                        "name": "field"
                                    },
                                    "computed": false,
                                    "value": {
                                        "type": "MemberExpression",
                                        "computed": true,
                                        "object": {
                                            "type": "MemberExpression",
                                            "computed": false,
                                            "object": {
                                                "type": "MemberExpression",
                                                "computed": false,
                                                "object": {
                                                    "type": "ThisExpression"
                                                },
                                                "property": {
                                                    "type": "Identifier",
                                                    "name": "meta"
                                                }
                                            },
                                            "property": {
                                                "type": "Identifier",
                                                "name": "fields"
                                            }
                                        },
                                        "property": {
                                            "type": "Literal",
                                            "value": fieldName,
                                            "raw": `'${fieldName}'`
                                        }
                                    },
                                    "kind": "init",
                                    "method": false,
                                    "shorthand": false
                                }
                            ]
                        }
                    ]
                }
            },
            {
                "type": "ReturnStatement",
                "argument": {
                    "type": "Identifier",
                    "name": "context"
                }
            }
        ]
    },
    "alternate": null
});

const _fieldExistenseCheck = (fieldName, content) => ({
    "type": "IfStatement",
    "test": {
        "type": "BinaryExpression",
        "operator": "in",
        "left": {
            "type": "Literal",
            "value": fieldName,
            "raw": `'${fieldName}'`
        },
        "right": {
            "type": "Identifier",
            "name": "latest"
        }
    },
    "consequent": {
        "type": "BlockStatement",
        "body": content
    },
    "alternate": null
});

const _preUpdateHeader = [
    {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": "context"
                },
                "init": {
                    "type": "AwaitExpression",
                    "argument": {
                        "type": "CallExpression",
                        "callee": {
                            "type": "MemberExpression",
                            "computed": false,
                            "object": {
                                "type": "Super"
                            },
                            "property": {
                                "type": "Identifier",
                                "name": "_preUpdate"
                            }
                        },
                        "arguments": []
                    }
                }
            }
        ],
        "kind": "let"
    },
    {
        "type": "IfStatement",
        "test": {
            "type": "BinaryExpression",
            "operator": ">",
            "left": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": {
                        "type": "Identifier",
                        "name": "context"
                    },
                    "property": {
                        "type": "Identifier",
                        "name": "errors"
                    }
                },
                "property": {
                    "type": "Identifier",
                    "name": "length"
                }
            },
            "right": {
                "type": "Literal",
                "value": 0,
                "raw": "0"
            }
        },
        "consequent": {
            "type": "ReturnStatement",
            "argument": {
                "type": "Identifier",
                "name": "context"
            }
        },
        "alternate": null
    },
    {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": "latest"
                },
                "init": {
                    "type": "NewExpression",
                    "callee": {
                        "type": "Identifier",
                        "name": "Proxy"
                    },
                    "arguments": [
                        {
                            "type": "MemberExpression",
                            "computed": false,
                            "object": {
                                "type": "Identifier",
                                "name": "context"
                            },
                            "property": {
                                "type": "Identifier",
                                "name": "latest"
                            }
                        },
                        {
                            "type": "ObjectExpression",
                            "properties": [
                                {
                                    "type": "Property",
                                    "key": {
                                        "type": "Identifier",
                                        "name": "get"
                                    },
                                    "computed": false,
                                    "value": {
                                        "type": "ArrowFunctionExpression",
                                        "id": null,
                                        "params": [
                                            {
                                                "type": "Identifier",
                                                "name": "obj"
                                            },
                                            {
                                                "type": "Identifier",
                                                "name": "prop"
                                            }
                                        ],
                                        "body": {
                                            "type": "BlockStatement",
                                            "body": [
                                                {
                                                    "type": "IfStatement",
                                                    "test": {
                                                        "type": "BinaryExpression",
                                                        "operator": "in",
                                                        "left": {
                                                            "type": "Identifier",
                                                            "name": "prop"
                                                        },
                                                        "right": {
                                                            "type": "Identifier",
                                                            "name": "obj"
                                                        }
                                                    },
                                                    "consequent": {
                                                        "type": "ReturnStatement",
                                                        "argument": {
                                                            "type": "MemberExpression",
                                                            "computed": true,
                                                            "object": {
                                                                "type": "Identifier",
                                                                "name": "obj"
                                                            },
                                                            "property": {
                                                                "type": "Identifier",
                                                                "name": "prop"
                                                            }
                                                        }
                                                    },
                                                    "alternate": null
                                                },
                                                {
                                                    "type": "ReturnStatement",
                                                    "argument": {
                                                        "type": "MemberExpression",
                                                        "computed": true,
                                                        "object": {
                                                            "type": "MemberExpression",
                                                            "computed": false,
                                                            "object": {
                                                                "type": "Identifier",
                                                                "name": "context"
                                                            },
                                                            "property": {
                                                                "type": "Identifier",
                                                                "name": "existing"
                                                            }
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "prop"
                                                        }
                                                    }
                                                }
                                            ]
                                        },
                                        "generator": false,
                                        "expression": false,
                                        "async": false
                                    },
                                    "kind": "init",
                                    "method": false,
                                    "shorthand": false
                                },
                                {
                                    "type": "Property",
                                    "key": {
                                        "type": "Identifier",
                                        "name": "set"
                                    },
                                    "computed": false,
                                    "value": {
                                        "type": "ArrowFunctionExpression",
                                        "id": null,
                                        "params": [
                                            {
                                                "type": "Identifier",
                                                "name": "obj"
                                            },
                                            {
                                                "type": "Identifier",
                                                "name": "prop"
                                            },
                                            {
                                                "type": "Identifier",
                                                "name": "value"
                                            }
                                        ],
                                        "body": {
                                            "type": "BlockStatement",
                                            "body": [
                                                {
                                                    "type": "ExpressionStatement",
                                                    "expression": {
                                                        "type": "AssignmentExpression",
                                                        "operator": "=",
                                                        "left": {
                                                            "type": "MemberExpression",
                                                            "computed": true,
                                                            "object": {
                                                                "type": "MemberExpression",
                                                                "computed": false,
                                                                "object": {
                                                                    "type": "Identifier",
                                                                    "name": "context"
                                                                },
                                                                "property": {
                                                                    "type": "Identifier",
                                                                    "name": "latest"
                                                                }
                                                            },
                                                            "property": {
                                                                "type": "Identifier",
                                                                "name": "prop"
                                                            }
                                                        },
                                                        "right": {
                                                            "type": "Identifier",
                                                            "name": "value"
                                                        }
                                                    }
                                                },
                                                {
                                                    "type": "ReturnStatement",
                                                    "argument": {
                                                        "type": "Literal",
                                                        "value": true,
                                                        "raw": "true"
                                                    }
                                                }
                                            ]
                                        },
                                        "generator": false,
                                        "expression": false,
                                        "async": false
                                    },
                                    "kind": "init",
                                    "method": false,
                                    "shorthand": false
                                }
                            ]
                        }
                    ]
                }
            }
        ],
        "kind": "let"
    },
    {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "ObjectPattern",
                    "properties": [
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "existing"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "existing"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "latest"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "latest"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "raw"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "raw"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "errors"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "errors"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        }
                    ]
                },
                "init": {
                    "type": "Identifier",
                    "name": "context"
                }
            }
        ],
        "kind": "let"
    }
];

const restMethods = (serviceId, entityName, className) => ({
    "type": "Program",
    "body": [
        {
            "type": "ExpressionStatement",
            "expression": {
                "type": "Literal",
                "value": "use strict",
                "raw": "\"use strict\""
            },
            "directive": "use strict"
        },
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "Mowa"
                    },
                    "init": {
                        "type": "CallExpression",
                        "callee": {
                            "type": "Identifier",
                            "name": "require"
                        },
                        "arguments": [
                            {
                                "type": "Literal",
                                "value": "mowa",
                                "raw": "'mowa'"
                            }
                        ]
                    }
                }
            ],
            "kind": "const"
        },
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "dbId"
                    },
                    "init": {
                        "type": "Literal",
                        "value": serviceId,
                        "raw": `'${serviceId}'`
                    }
                }
            ],
            "kind": "const"
        },
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "modelName"
                    },
                    "init": {
                        "type": "Literal",
                        "value": entityName,
                        "raw": `'${entityName}'`
                    }
                }
            ],
            "kind": "const"
        },
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "query"
                    },
                    "init": {
                        "type": "ArrowFunctionExpression",
                        "id": null,
                        "params": [
                            {
                                "type": "Identifier",
                                "name": "ctx"
                            }
                        ],
                        "body": {
                            "type": "BlockStatement",
                            "body": [
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": "db"
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "type": "Identifier",
                                                            "name": "ctx"
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "appModule"
                                                        }
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "dbId"
                                                    },
                                                    {
                                                        "type": "Identifier",
                                                        "name": "ctx"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": className
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "model"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "modelName"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "ReturnStatement",
                                    "argument": {
                                        "type": "CallExpression",
                                        "callee": {
                                            "type": "MemberExpression",
                                            "computed": false,
                                            "object": {
                                                "type": "Identifier",
                                                "name": className
                                            },
                                            "property": {
                                                "type": "Identifier",
                                                "name": "find"
                                            }
                                        },
                                        "arguments": [
                                            {
                                                "type": "MemberExpression",
                                                "computed": false,
                                                "object": {
                                                    "type": "Identifier",
                                                    "name": "ctx"
                                                },
                                                "property": {
                                                    "type": "Identifier",
                                                    "name": "query"
                                                }
                                            },
                                            {
                                                "type": "Literal",
                                                "value": true,
                                                "raw": "true"
                                            }
                                        ]
                                    }
                                }
                            ]
                        },
                        "generator": false,
                        "expression": false,
                        "async": true
                    }
                }
            ],
            "kind": "const"
        },
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "detail"
                    },
                    "init": {
                        "type": "ArrowFunctionExpression",
                        "id": null,
                        "params": [
                            {
                                "type": "Identifier",
                                "name": "ctx"
                            }
                        ],
                        "body": {
                            "type": "BlockStatement",
                            "body": [
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": "id"
                                            },
                                            "init": {
                                                "type": "MemberExpression",
                                                "computed": false,
                                                "object": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "Identifier",
                                                        "name": "ctx"
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "params"
                                                    }
                                                },
                                                "property": {
                                                    "type": "Identifier",
                                                    "name": "id"
                                                }
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": "db"
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "type": "Identifier",
                                                            "name": "ctx"
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "appModule"
                                                        }
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "dbId"
                                                    },
                                                    {
                                                        "type": "Identifier",
                                                        "name": "ctx"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": className
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "model"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "modelName"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": entityName
                                            },
                                            "init": {
                                                "type": "AwaitExpression",
                                                "argument": {
                                                    "type": "CallExpression",
                                                    "callee": {
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "type": "Identifier",
                                                            "name": className
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "findOne"
                                                        }
                                                    },
                                                    "arguments": [
                                                        {
                                                            "type": "Identifier",
                                                            "name": "id"
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "IfStatement",
                                    "test": {
                                        "type": "UnaryExpression",
                                        "operator": "!",
                                        "argument": {
                                            "type": "Identifier",
                                            "name": entityName
                                        },
                                        "prefix": true
                                    },
                                    "consequent": {
                                        "type": "BlockStatement",
                                        "body": [
                                            {
                                                "type": "ReturnStatement",
                                                "argument": {
                                                    "type": "ObjectExpression",
                                                    "properties": [
                                                        {
                                                            "type": "Property",
                                                            "key": {
                                                                "type": "Identifier",
                                                                "name": "error"
                                                            },
                                                            "computed": false,
                                                            "value": {
                                                                "type": "Literal",
                                                                "value": "record_not_found",
                                                                "raw": "'record_not_found'"
                                                            },
                                                            "kind": "init",
                                                            "method": false,
                                                            "shorthand": false
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    },
                                    "alternate": null
                                },
                                {
                                    "type": "ReturnStatement",
                                    "argument": {
                                        "type": "MemberExpression",
                                        "computed": false,
                                        "object": {
                                            "type": "Identifier",
                                            "name": entityName
                                        },
                                        "property": {
                                            "type": "Identifier",
                                            "name": "data"
                                        }
                                    }
                                }
                            ]
                        },
                        "generator": false,
                        "expression": false,
                        "async": true
                    }
                }
            ],
            "kind": "const"
        },
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "create"
                    },
                    "init": {
                        "type": "ArrowFunctionExpression",
                        "id": null,
                        "params": [
                            {
                                "type": "Identifier",
                                "name": "ctx"
                            }
                        ],
                        "body": {
                            "type": "BlockStatement",
                            "body": [
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": "db"
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "type": "Identifier",
                                                            "name": "ctx"
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "appModule"
                                                        }
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "dbId"
                                                    },
                                                    {
                                                        "type": "Identifier",
                                                        "name": "ctx"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": className
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "model"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "modelName"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": entityName
                                            },
                                            "init": {
                                                "type": "NewExpression",
                                                "callee": {
                                                    "type": "Identifier",
                                                    "name": className
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "type": "MemberExpression",
                                                            "computed": false,
                                                            "object": {
                                                                "type": "Identifier",
                                                                "name": "ctx"
                                                            },
                                                            "property": {
                                                                "type": "Identifier",
                                                                "name": "request"
                                                            }
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "fields"
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "ReturnStatement",
                                    "argument": {
                                        "type": "MemberExpression",
                                        "computed": false,
                                        "object": {
                                            "type": "AwaitExpression",
                                            "argument": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "Identifier",
                                                        "name": entityName
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "save"
                                                    }
                                                },
                                                "arguments": []
                                            }
                                        },
                                        "property": {
                                            "type": "Identifier",
                                            "name": "data"
                                        }
                                    }
                                }
                            ]
                        },
                        "generator": false,
                        "expression": false,
                        "async": true
                    }
                }
            ],
            "kind": "const"
        },
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "update"
                    },
                    "init": {
                        "type": "ArrowFunctionExpression",
                        "id": null,
                        "params": [
                            {
                                "type": "Identifier",
                                "name": "ctx"
                            }
                        ],
                        "body": {
                            "type": "BlockStatement",
                            "body": [
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": "id"
                                            },
                                            "init": {
                                                "type": "MemberExpression",
                                                "computed": false,
                                                "object": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "Identifier",
                                                        "name": "ctx"
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "params"
                                                    }
                                                },
                                                "property": {
                                                    "type": "Identifier",
                                                    "name": "id"
                                                }
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": "db"
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "type": "Identifier",
                                                            "name": "ctx"
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "appModule"
                                                        }
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "dbId"
                                                    },
                                                    {
                                                        "type": "Identifier",
                                                        "name": "ctx"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": className
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "model"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "modelName"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": entityName
                                            },
                                            "init": {
                                                "type": "AwaitExpression",
                                                "argument": {
                                                    "type": "CallExpression",
                                                    "callee": {
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "type": "Identifier",
                                                            "name": className
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "findOne"
                                                        }
                                                    },
                                                    "arguments": [
                                                        {
                                                            "type": "Identifier",
                                                            "name": "id"
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "IfStatement",
                                    "test": {
                                        "type": "Identifier",
                                        "name": entityName
                                    },
                                    "consequent": {
                                        "type": "BlockStatement",
                                        "body": [
                                            {
                                                "type": "ExpressionStatement",
                                                "expression": {
                                                    "type": "CallExpression",
                                                    "callee": {
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "type": "Identifier",
                                                            "name": "Object"
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "assign"
                                                        }
                                                    },
                                                    "arguments": [
                                                        {
                                                            "type": "MemberExpression",
                                                            "computed": false,
                                                            "object": {
                                                                "type": "Identifier",
                                                                "name": entityName
                                                            },
                                                            "property": {
                                                                "type": "Identifier",
                                                                "name": "data"
                                                            }
                                                        },
                                                        {
                                                            "type": "MemberExpression",
                                                            "computed": false,
                                                            "object": {
                                                                "type": "MemberExpression",
                                                                "computed": false,
                                                                "object": {
                                                                    "type": "Identifier",
                                                                    "name": "ctx"
                                                                },
                                                                "property": {
                                                                    "type": "Identifier",
                                                                    "name": "request"
                                                                }
                                                            },
                                                            "property": {
                                                                "type": "Identifier",
                                                                "name": "fields"
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                "type": "ReturnStatement",
                                                "argument": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "AwaitExpression",
                                                        "argument": {
                                                            "type": "CallExpression",
                                                            "callee": {
                                                                "type": "MemberExpression",
                                                                "computed": false,
                                                                "object": {
                                                                    "type": "Identifier",
                                                                    "name": entityName
                                                                },
                                                                "property": {
                                                                    "type": "Identifier",
                                                                    "name": "save"
                                                                }
                                                            },
                                                            "arguments": []
                                                        }
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "data"
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    "alternate": null
                                },
                                {
                                    "type": "ReturnStatement",
                                    "argument": {
                                        "type": "ObjectExpression",
                                        "properties": [
                                            {
                                                "type": "Property",
                                                "key": {
                                                    "type": "Identifier",
                                                    "name": "error"
                                                },
                                                "computed": false,
                                                "value": {
                                                    "type": "Literal",
                                                    "value": "record_not_found",
                                                    "raw": "'record_not_found'"
                                                },
                                                "kind": "init",
                                                "method": false,
                                                "shorthand": false
                                            }
                                        ]
                                    }
                                }
                            ]
                        },
                        "generator": false,
                        "expression": false,
                        "async": true
                    }
                }
            ],
            "kind": "const"
        },
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "remove"
                    },
                    "init": {
                        "type": "ArrowFunctionExpression",
                        "id": null,
                        "params": [
                            {
                                "type": "Identifier",
                                "name": "ctx"
                            }
                        ],
                        "body": {
                            "type": "BlockStatement",
                            "body": [
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": "id"
                                            },
                                            "init": {
                                                "type": "MemberExpression",
                                                "computed": false,
                                                "object": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "Identifier",
                                                        "name": "ctx"
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "params"
                                                    }
                                                },
                                                "property": {
                                                    "type": "Identifier",
                                                    "name": "id"
                                                }
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": "db"
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "type": "Identifier",
                                                            "name": "ctx"
                                                        },
                                                        "property": {
                                                            "type": "Identifier",
                                                            "name": "appModule"
                                                        }
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "dbId"
                                                    },
                                                    {
                                                        "type": "Identifier",
                                                        "name": "ctx"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "VariableDeclaration",
                                    "declarations": [
                                        {
                                            "type": "VariableDeclarator",
                                            "id": {
                                                "type": "Identifier",
                                                "name": className
                                            },
                                            "init": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "MemberExpression",
                                                    "computed": false,
                                                    "object": {
                                                        "type": "Identifier",
                                                        "name": "db"
                                                    },
                                                    "property": {
                                                        "type": "Identifier",
                                                        "name": "model"
                                                    }
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "modelName"
                                                    }
                                                ]
                                            }
                                        }
                                    ],
                                    "kind": "let"
                                },
                                {
                                    "type": "ExpressionStatement",
                                    "expression": {
                                        "type": "AwaitExpression",
                                        "argument": {
                                            "type": "CallExpression",
                                            "callee": {
                                                "type": "MemberExpression",
                                                "computed": false,
                                                "object": {
                                                    "type": "Identifier",
                                                    "name": className
                                                },
                                                "property": {
                                                    "type": "Identifier",
                                                    "name": "removeOne"
                                                }
                                            },
                                            "arguments": [
                                                {
                                                    "type": "Identifier",
                                                    "name": "id"
                                                }
                                            ]
                                        }
                                    }
                                },
                                {
                                    "type": "ReturnStatement",
                                    "argument": {
                                        "type": "ObjectExpression",
                                        "properties": [
                                            {
                                                "type": "Property",
                                                "key": {
                                                    "type": "Identifier",
                                                    "name": "status"
                                                },
                                                "computed": false,
                                                "value": {
                                                    "type": "Literal",
                                                    "value": "ok",
                                                    "raw": "'ok'"
                                                },
                                                "kind": "init",
                                                "method": false,
                                                "shorthand": false
                                            }
                                        ]
                                    }
                                }
                            ]
                        },
                        "generator": false,
                        "expression": false,
                        "async": true
                    }
                }
            ],
            "kind": "const"
        },
        {
            "type": "ExpressionStatement",
            "expression": {
                "type": "AssignmentExpression",
                "operator": "=",
                "left": {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": {
                        "type": "Identifier",
                        "name": "module"
                    },
                    "property": {
                        "type": "Identifier",
                        "name": "exports"
                    }
                },
                "right": {
                    "type": "ObjectExpression",
                    "properties": [
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "query"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "query"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "detail"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "detail"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "create"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "create"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "update"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "update"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        },
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "remove"
                            },
                            "computed": false,
                            "value": {
                                "type": "Identifier",
                                "name": "remove"
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": true
                        }
                    ]
                }
            }
        }
    ],
    "sourceType": "script"
});

module.exports = {
    _preCreateHeader,
    _preCreateValidateCheck,
    _preUpdateHeader,
    _fieldExistenseCheck,
    restMethods
};