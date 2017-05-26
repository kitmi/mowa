"use strict";

const _ = require('lodash');
const EventEmitter = require('events');
const inflection = require('inflection');
const path = require('path');
const Oolong = require('../../lang/oolong.js');
const OolUtil = require('../../lang/ool-utils.js');
const Util = require('../../../util.js');
const S = Util.S;

class MysqlModeler {
    constructor(modeler, options) {
        this.modeler = modeler;
        this.linker = modeler.linker;
        this.options = options;

        this.events = new EventEmitter();

        this.commonTableOptions = _.reduce(this.options.tableOptions,
            function(result, value, key) {
                result[_.upperCase(key)] = value;
                return result;
            }, {});        
    }

    modeling(schema) {
        let modelingSchema = schema.clone();        

        if (modelingSchema.relations) {
            this.linker.log('debug', 'Building relations...');

            _.each(modelingSchema.relations, (relation) => {
                this.buildRelation(schema, relation);
            });
        }

        //build SQL scripts
        let sqlFilesDir = path.join('mysql', schema.name);
        let dbFilePath = path.join(sqlFilesDir, 'entities.sql');
        let fkFilePath = path.join(sqlFilesDir, 'relations.sql');        
        let tableSQL = '', relationSQL = '';

        const self = this;

        _.each(modelingSchema.entities, (entity, entityName) => {
            let result = MysqlModeler.complianceCheck(entity);
            if (result.errors.length) {
                let message = '';
                if (result.warnings.length > 0) {
                    message += 'Warnings: \n' + result.warnings.join('\n') + '\n';
                }
                message += result.errors.join('\n');

                throw new Error(message);
            }

            if (entity.features) {                
                _.forOwn(entity.features, ((fArray, name) => { 
                    Object.assign(entity.dbFeatures, self.featureReducer(entity, f));
                }));
            }
            
            if (entity.relations) {
                _.each(entity.relations, (relation) => {
                    relationSQL += MysqlModeler.addForeignKeyStatement(entityName, entity, relation) + '\n';
                });
            }

            tableSQL += self.createTableStatement(entityName, entity) + '\n';            
        });

        this.modeler.buildFile(dbFilePath, tableSQL);
        this.modeler.buildFile(fkFilePath, relationSQL);

        return modelingSchema;
    }

    featureReducer(entity, feature) {        
        let field, dbFeatures = {};

        switch (feature.name) {
            case 'autoId':
                field = entity.fields[feature.field];

                if (field.type === 'int'
                    && _.isPlainObject(field.default)
                    && field.default.type === 'Pragma'
                    && field.default.value === 'db-generated-first'
                ) {
                    if ('startFrom' in field) {
                        this.events.on('onSetTableOptions', extraOpts => {
                            extraOpts['AUTO_INCREMENT'] = field.startFrom;
                        });
                    }

                    dbFeatures.autoIncrementField = field.name;
                }
                break;

            case 'createTimestamp':
                break;

            case 'updateTimestamp':
                break;

            case 'logicalDeletion':
                break;

            case 'atLeastOneNotNull':
                break;

            case 'validateAllFieldsOnCreation':

                break;

            default:
                throw new Error('Unsupported feature "' + feature.name + '".');
        }

        return dbFeatures;
    }

    buildRelation(schema, relation) {
        this.linker.log('debug', 'Analyzing relation between ['
        + relation.left + '] and ['
        + relation.right + '] relationship: '
        + relation.relationship + ' ...');

        if (relation.relationship === 'n:n') {
            this.buildNToNRelation(schema, relation);
        } else if (relation.relationship === '1:n' || relation.relationship === '1:1') {
            this.build1ToAnyRelation(schema, relation);
        } else if (relation.relationship === 'n:1') {
            this.buildManyToOneRelation(schema, relation);
        } else {
            console.log(relation);
            throw new Error('TBD');
        }
    }

    buildManyToOneRelation(schema, relation) {
        let leftEntity = schema.entities[relation.left];
        let rightEntity = schema.entities[relation.right];

        let rightKeyInfo = rightEntity.getKeyTypeInfo();
        let leftField = relation.leftField || MysqlModeler.foreignKeyFieldNaming(relation.right, rightEntity);

        leftEntity
            .addField(leftField, rightKeyInfo)
            .addRelation(relation.right,
                Object.assign(_.omit(relation, ['left']), {
                    leftField: leftField,
                    rightField: rightEntity.key
                })
            );
    }

    build1ToAnyRelation(schema, relation) {
        let leftEntity = schema.entities[relation.left];
        let rightEntity = schema.entities[relation.right];

        let rightKeyInfo = rightEntity.getKeyTypeInfo();
        let leftField = MysqlModeler.foreignKeyFieldNaming(relation.right, rightEntity);

        leftEntity.addField(leftField, rightKeyInfo)
            .addRelation(relation.right,
            Object.assign(_.omit(relation, ['left']), {
                leftField: leftField,
                rightField: rightEntity.key
            }));
        
        if (relation.multiGroup) {
            //console.log(relation.multiGroup);
            //console.log(leftEntity.relations);
            if (_.findIndex(relation.multiGroup, to => {
                    return !(to in leftEntity.relations);
                }) === -1) {

                let index = {
                    fields: _.map(relation.multiGroup, to => leftEntity.relations[to].leftField)
                };

                if (relation.relationship === '1:1') {
                    index.unique = true;
                }

                leftEntity.addIndex(index);
            }
        }
    }

    buildNToNRelation(schema, relation) {
        let relationEntityName = relation.left + inflection.camelize(inflection.pluralize(relation.right));

        if (schema.hasEntity(relationEntityName)) {
            let fullName = schema.entities[relationEntityName].id;

            throw new Error(`Entity [${relationEntityName}] conflicts with entity [${fullName}] in schema [${schema.name}].`);
        }

        this.linker.log('debug', `Create a relation entity for "${relation.left}" and "${relation.right}".`);    
        
        let leftEntity = schema.entities[relation.left];
        let rightEntity = schema.entities[relation.right];
        
        let leftKeyInfo = leftEntity.getKeyTypeInfo();
        let rightKeyInfo = rightEntity.getKeyTypeInfo();
        
        if (Array.isArray(leftKeyInfo) || Array.isArray(rightKeyInfo)) {
            throw new Error('Multi-fields key not supported for non-relationship entity.');
        }

        let leftField1 = MysqlModeler.foreignKeyFieldNaming(relation.left, leftEntity);
        let leftField2 = MysqlModeler.foreignKeyFieldNaming(relation.right, rightEntity);
        
        let entityInfo = {
            features: [ 'createTimestamp' ],
            fields: {
                [leftField1]: leftKeyInfo,
                [leftField2]: rightKeyInfo
            },
            key: [ leftField1, leftField2 ]
        };

        let entity = new Entity(this.modeler.linker, relationEntityName, schema.oolModule, entityInfo);
        entity.init().addRelation(relation.left,
            Object.assign(_.omit(relation, ['left']), {
                relationship: relation.relationship.substr(0, 1) + ':1',
                leftField: leftField1,
                right: relation.left,
                rightField: leftEntity.key
            })).addRelation(relation.right,
            Object.assign(_.omit(relation, ['left']), {
                relationship: relation.relationship.substr(2, 1) + ':1',
                leftField: leftField2,
                rightField: rightEntity.key
            })).markAsRelationshipEntity();

        schema.addEntity(relationEntityName, entity);
    }   

    createTableStatement(entityName, entity) {
        let sql = 'CREATE TABLE IF NOT EXISTS `' + entityName + '` (\n';

        //column definitions
        _.each(entity.fields, (info, name) => {
            sql += '  ' + MysqlModeler.quoteIdentifier(name) + ' ' + MysqlModeler.columnDefinition(entity, info) + ',\n';
        });

        //primary key
        sql += '  PRIMARY KEY (' + MysqlModeler.quoteListOrValue(entity.key) + '),\n';

        //other keys
        if (entity.indexes && entity.indexes.length > 0) {
            entity.indexes.forEach(index => {
                sql += '  ';
                if (index.unique) {
                    sql += 'UNIQUE ';
                }
                sql += 'KEY (' + MysqlModeler.quoteListOrValue(index.fields) + '),\n';
            });
        }

        let lines = [];
        this.events.emit('beforeEndColumnDefinition', lines);
        if (lines.length > 0) {
            sql += '  ' + lines.join(',\n  ');
        } else {
            sql = sql.substr(0, sql.length-2);
        }

        sql += '\n)';

        //table options
        let extraProps = {};
        this.events.emit('onSetTableOptions', extraProps);
        let props = Object.assign({}, this.commonTableOptions, extraProps);

        sql = _.reduce(props, function(result, value, key) {
            return result + ' ' + key + '=' + value;
        }, sql);

        sql += ';\n';

        this.events.removeAllListeners();

        return sql;
    }
    
    static addForeignKeyStatement(entityName, entity, relation) {
        let sql = 'ALTER TABLE `' + entityName +
            '` ADD FOREIGN KEY (`' + relation.leftField + '`) ' +
            'REFERENCES `' + relation.right + '` (`' + relation.rightField + '`) ';

        sql += '';

        if (entity.isRelationshipEntity) {
            sql += 'ON DELETE CASCADE ON UPDATE CASCADE';
        } else {
            sql += 'ON DELETE NO ACTION ON UPDATE NO ACTION';
        }

        sql += ';\n';

        return sql;
    }

    static foreignKeyFieldNaming(entityName, entity) {
        let leftPart = inflection.camelize(entityName, true);
        let rightPart = inflection.camelize(entity.key);

        if (_.endsWith(leftPart, rightPart)) {
            return leftPart;
        }

        return leftPart + rightPart;
    }

    static quoteString(str) {
        return "'" + str.replace(/'/g, "\\'") + "'";
    }

    static quoteIdentifier(str) {
        return "`" + str + "`";
    }

    static quoteListOrValue(obj) {
        return _.isArray(obj) ?
            obj.map(v => MysqlModeler.quoteIdentifier(v)).join(', ') :
            MysqlModeler.quoteIdentifier(obj);
    }

    static complianceCheck(entity) {
        let result = { errors: [], warnings: [] };

        if (!entity.key) {
            result.errors.push('Primary key is not specified.');
        }

        return result;
    }

    static columnDefinition(entity, info) {
        let sql;
        
        switch (info.type) {
            case 'int':
                sql = MysqlModeler.intColumnDefinition(info);
                break;

            case 'float':
            case 'decimal':
                sql =  MysqlModeler.floatColumnDefinition(info);
                break;

            case 'text':
                sql =  MysqlModeler.textColumnDefinition(info);
                break;

            case 'bool':
                sql =  MysqlModeler.boolColumnDefinition(info);
                break;

            case 'binary':
                sql =  MysqlModeler.binaryColumnDefinition(info);
                break;

            case 'datetime':
                sql =  MysqlModeler.datetimeColumnDefinition(info);
                break;

            case 'json':
                sql =  MysqlModeler.textColumnDefinition(info);
                break;

            case 'xml':
                sql =  MysqlModeler.textColumnDefinition(info);
                break;

            case 'enum':
                sql =  MysqlModeler.enumColumnDefinition(info);
                break;

            case 'csv':
                sql =  MysqlModeler.textColumnDefinition(info);
                break;

            default:
                throw new Error('Unsupported type "' + info.type + '".');
        }

        sql += this.columnNullable(info);
        sql += this.defaultValue(info);

        return sql;
    }

    static intColumnDefinition(info) {
        let sql;

        if (info.digits) {
            if (info.digits > 10) {
                sql = 'BIGINT';
            } else if (info.digits > 7) {
                sql = 'INT';
            } else if (info.digits > 4) {
                sql = 'MEDIUMINT';
            } else if (info.digits > 2) {
                sql = 'SMALLINT';
            } else {
                sql = 'TINYINT';
            }

            sql += `(${info.digits})`
        } else {
            sql = 'INT';
        }

        if (info.unsigned) {
            sql += ' UNSIGNED';
        }

        return sql;
    }

    static floatColumnDefinition(info) {
        let sql = '';

        if (info.type == 'decimal') {
            sql = 'DECIMAL';

            if (info.totalDigits > 65) {
                throw new Error('Total digits exceed maximum limit.');
            }
        } else {
            if (info.totalDigits > 23) {
                sql = 'DOUBLE';

                if (info.totalDigits > 53) {
                    throw new Error('Total digits exceed maximum limit.');
                }
            } else {
                sql = 'FLOAT';
            }
        }

        if ('totalDigits' in info) {
            sql += '(' + info.totalDigits;
            if ('decimalDigits' in info) {
                sql += ', ' +info.decimalDigits;
            }
            sql += ')';

        } else {
            if ('decimalDigits' in info) {
                if (info.decimalDigits > 23) {
                    sql += '(53, ' +info.decimalDigits + ')';
                } else  {
                    sql += '(23, ' +info.decimalDigits + ')';
                }
            }
        }

        return sql;
    }

    static textColumnDefinition(info) {
        let sql = '';

        if (info.fixedLength && info.fixedLength <= 255) {
            sql = 'CHAR(' + info.fixedLength + ')';
        } else if (info.maxLength) {
            if (info.maxLength > 16777215) {
                sql = 'LONGTEXT';
            } else if (info.maxLength > 65535) {
                sql = 'MEDIUMTEXT';
            } else {
                sql = 'VARCHAR';
                if (info.fixedLength) {
                    sql += '(' + info.fixedLength + ')';
                } else {
                    sql += '(' + info.maxLength + ')';
                }
            }
        } else {
            sql = 'TEXT';
        }

        return sql;
    }

    static binaryColumnDefinition(info) {
        let sql = '';

        if (info.fixedLength <= 255) {
            sql = 'BINARY(' + info.fixedLength + ')';
        } else if (info.maxLength) {
            if (info.maxLength > 16777215) {
                sql = 'LONGBLOB';
            } else if (info.maxLength > 65535) {
                sql = 'MEDIUMBLOB';
            } else {
                sql = 'VARBINARY';
                if (info.fixedLength) {
                    sql += '(' + info.fixedLength + ')';
                } else {
                    sql += '(' + info.maxLength + ')';
                }
            }
        } else {
            sql = 'BLOB';
        }

        return sql;
    }

    static boolColumnDefinition() {
        return 'TINYINT(1)';
    }

    static datetimeColumnDefinition(info) {
        let sql;

        if (!info.range || info.range === 'datetime') {
            sql = 'DATETIME';
        } else if (info.range === 'date') {
            sql = 'DATE';
        } else if (info.range === 'time') {
            sql = 'TIME';
        } else if (info.range === 'year') {
            sql = 'YEAR';
        } else if (info.range === 'timestamp') {
            sql = 'TIMESTAMP';
        }

        if (info.updateDefault 
            && _.isPlainObject(info.updateDefault)
            && info.updateDefault.type === 'Pragma'
            && info.updateDefault.value === 'db-generated-first'
        ) {
            if (info.range === 'datetime' || info.range === 'timestamp') {
                sql += ' ON UPDATE CURRENT_TIMESTAMP';
            } else {
                throw new Error('Invalid modeler specific setting for default value on updating.');
            }

            delete info.updateDefault;
        }

        return sql;
    }

    static enumColumnDefinition(info) {
        return 'ENUM(' + _.map(OolUtil.translateOolObj(info.values), (v) => MysqlModeler.quoteString(v)).join(', ') + ')';
    }

    static columnNullable(info) {
        if (info.hasOwnProperty('optional') && info.optional) {
            return ' NULL';
        }

        return ' NOT NULL';
    }

    static defaultValue(info) {
        if (info.hasOwnProperty('default')) {
            if (_.isPlainObject(info.default)) {
                if (info.default.type == 'Pragma' && info.default.value === 'db-generated-first') {
                    if (info.type === 'datetime') {
                        delete info.default;
                        info.defaultByDb = true;

                        return ' DEFAULT CURRENT_TIMESTAMP';
                    } else if (info.type === 'int') {
                        delete info.default;
                        info.defaultByDb = true;

                        return ' AUTO_INCREMENT';
                    } else if (info.type === 'text' && info.subClass.indexOf('uuid') > -1) {
                        info.default = {type: 'DbFunction', name: 'UUID'};
                        return '';
                    } else {
                        info.default = {type: 'Generator'};

                        return '';
                    }
                }

                return '';
            } else {
                let defaultValue = info.default;
                delete info.default;
                info.defaultByDb = true;

                if (info.type === 'bool') {
                    if (_.isString(defaultValue)) {
                        return ' DEFAULT ' + (S(defaultValue).toBoolean() ? '1' : '0');
                    }

                    return ' DEFAULT ' + (defaultValue ? '1' : '0');
                } else if (info.type === 'int') {
                    if (_.isInteger(defaultValue)) {
                        return ' DEFAULT ' + defaultValue.toString();
                    }                    

                    return ' DEFAULT ' + parseInt(defaultValue).toString();
                } else if (info.type === 'text') {
                    return ' DEFAULT ' + Util.quote(defaultValue);
                } else if (info.type === 'float') {
                    if (_.isNumber(defaultValue)) {
                        return ' DEFAULT ' + defaultValue.toString();
                    }

                    return ' DEFAULT ' + parseFloat(defaultValue).toString();
                } else if (info.type === 'binary') {
                    return ' DEFAULT ' + Util.bin2Hex(defaultValue);                
                } else if (info.type === 'datetime') {
                    if (_.isInteger(defaultValue)) {
                        return ' DEFAULT ' + defaultValue.toString();
                    }

                    return ' DEFAULT ' + Util.quote(defaultValue);
                } else if (info.type === 'json') {
                    if (_.isPlainObject(defaultValue)) {
                        return ' DEFAULT ' + Util.quote(JSON.stringify(OolUtil.mapOolObject(defaultValue)));
                    }
                
                    return ' DEFAULT ' + Util.quote(defaultValue);
                } else if (info.type === 'xml' || info.type === 'enum' || info.type === 'csv') {
                    return ' DEFAULT ' + Util.quote(defaultValue);
                }
            }
        }        

        return '';
    }
}

module.exports = MysqlModeler;