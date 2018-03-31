"use strict";

const EventEmitter = require('events');
const inflection = require('inflection');
const path = require('path');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;

const Oolong = require('../../lang/oolong.js');
const OolUtil = require('../../lang/ool-utils.js');
const OolongDbModeler = require('../db.js');
const Entity = require('../../lang/entity.js');

class MysqlModeler extends OolongDbModeler {
    /**
     * Ooolong database modeler for mysql db
     * @constructs OolongMysqlModeler
     * @extends OolongDbModeler
     * @param {object} context
     * @property {Logger} context.logger - Logger object
     * @property {AppModule} context.currentApp - Current app module
     * @property {bool} context.verbose - Verbose mode
     * @property {OolongLinker} context.linker - Oolong DSL linker
     * @param {object} dbmsOptions
     * @property {object} dbmsOptions.dbOptions
     * @property {object} dbmsOptions.tableOptions
     */
    constructor(context, dbmsOptions) {
        super(context);

        this._events = new EventEmitter();

        this._dbmsOptions = {
            dbOptions: _.reduce(dbmsOptions.dbOptions,
                function(result, value, key) {
                    result[_.upperCase(key)] = value;
                    return result;
                }, {}),
            tableOptions: _.reduce(dbmsOptions.tableOptions,
                function(result, value, key) {
                    result[_.upperCase(key)] = value;
                    return result;
                }, {})
        };

        this._references = {};
    }

    modeling(schema, buildPath) {
        super.modeling(schema, buildPath);

        let modelingSchema = schema.clone();

        if (modelingSchema.relations) {
            this.logger.log('debug', 'Building relations...');

            _.each(modelingSchema.relations, (relation) => {
                this._buildRelation(modelingSchema, relation);
            });
        }

        this._events.emit('afterRelationshipBuilding');

        //build SQL scripts
        let sqlFilesDir = path.join('mysql', schema.name);
        let dbFilePath = path.join(sqlFilesDir, 'entities.sql');
        let fkFilePath = path.join(sqlFilesDir, 'relations.sql');
        let tableSQL = '', relationSQL = '';

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
                _.forOwn(entity.features, (f, featureName) => {
                    if (Array.isArray(f)) {
                        f.forEach(ff => this._featureReducer(entity, featureName, ff));
                    } else {
                        this._featureReducer(entity, featureName, f);
                    }
                });
            }
            
            _.forOwn(this._references, (refs, entityName) => {
                _.each(refs, ref => {
                    relationSQL += MysqlModeler.addForeignKeyStatement(entityName, schema.entities[entityName], ref) + '\n';
                });
            });

            tableSQL += this._createTableStatement(entityName, entity) + '\n';
        });

        this._writeFile(path.join(buildPath, dbFilePath), tableSQL);
        this._writeFile(path.join(buildPath, fkFilePath), relationSQL);

        return modelingSchema;
    }

    async extract(dbService, extractedOolPath) {
        await super.extract(dbService, extractedOolPath);

        fs.ensureDirSync(extractedOolPath);

        let conn = await dbService.getConnection();

        let [ tables ] = await conn.query("select * from information_schema.tables where table_schema = ?", [ dbService.physicalDbName ]);

        let entities = [];

        let oolcodegen = require('../../lang/oolcodegen');
        let entitiesOolPath = path.join(extractedOolPath, 'entities');
        fs.ensureDirSync(entitiesOolPath);

        await Util.eachAsync_(tables, async table => {
            entities.push({ entity: table.TABLE_NAME });

            await this.extractTableDetails(dbService, conn, table, oolcodegen, entitiesOolPath);
        });

        let json = {
            "namespace": [
                "entities/**"
            ],
            "schema": {
                "entities": entities,
                "name": dbService.physicalDbName
            }
        };

        let schemaContent = oolcodegen.generate(json);
        let schemaFile = path.join(extractedOolPath, dbService.physicalDbName + '.ool');
        fs.writeFileSync(schemaFile, schemaContent);
        this.logger.log('info', `Extracted schema entry file "${schemaFile}".`);

        dbService.closeConnection(conn);
    }

    async extractTableDetails(dbService, conn, table, oolcodegen, extractedOolPath) {
        let [ columns ] = await conn.query("select * from information_schema.columns where table_schema = ? and table_name = ?",
            [dbService.physicalDbName, table.TABLE_NAME]);

        let features = [], fields = {}, indexes = [], types = {};

        columns.forEach(col => {
            if (col.EXTRA === 'auto_increment') {
                let featureInfo = {
                    "name": "autoId",
                    "options": {
                        "startFrom": table.AUTO_INCREMENT
                    }
                };

                if (col.COLUMN_NAME !== 'id') {
                    featureInfo.options.name = col.COLUMN_NAME;
                }

                features.push(featureInfo);
                return;
            }

            if (col.COLUMN_DEFAULT === 'CURRENT_TIMESTAMP') {
                let featureInfo = {
                    "name": "createTimestamp"
                };

                features.push(featureInfo);
                return;
            }

            if (col.EXTRA === 'on update CURRENT_TIMESTAMP') {
                let featureInfo = {
                    "name": "updateTimestamp"
                };

                features.push(featureInfo);
                return;
            }

            if (col.COLUMN_NAME === 'isDeleted' && col.COLUMN_TYPE === 'tinyint(1)') {
                let featureInfo = {
                    "name": "logicalDeletion"
                };

                features.push(featureInfo);
                return;
            }

            let fieldInfo = this._mysqlTypeToOolType(table, col, types);
            if (col.IS_NULLABLE === 'YES') {
                fieldInfo.optional = true;
            }

            if (col.COLUMN_DEFAULT) {
                fieldInfo.default = col.COLUMN_DEFAULT;
            }

            fields[col.COLUMN_NAME] = fieldInfo;
            
            if (col.COLUMN_KEY === 'UNI') {
                indexes.push({
                    fields: col.COLUMN_NAME,
                    unique: true
                });
            }
        });

        let [ indexInfo ] = await conn.query("show indexes from ??", [ table.TABLE_NAME ]);

        let entity = {
            type: types,
            entity: {
                [table.TABLE_NAME]: {
                    features,
                    fields,
                    indexes
                }
            }
        };

        console.dir(entity, {depth: 8, colors: true});

        let entityContent = oolcodegen.generate(entity);
        let entityFile = path.join(extractedOolPath, table.TABLE_NAME + '.ool');
        fs.writeFileSync(entityFile, entityContent);
        this.logger.log('info', `Extracted entity definition file "${entityFile}".`);
    }

    _mysqlTypeToOolType(table, col, types) {
        let typeInfo = {};

        switch (col.DATA_TYPE) {
            case 'varchar':
                typeInfo.type = 'text';
                if (col.CHARACTER_MAXIMUM_LENGTH) {
                    typeInfo.maxLength = col.CHARACTER_MAXIMUM_LENGTH;
                }
                break;

            case 'char':
                typeInfo.type = 'text';
                if (col.CHARACTER_MAXIMUM_LENGTH) {
                    typeInfo.fixedLength = col.CHARACTER_MAXIMUM_LENGTH;
                }
                break;

            case 'int':
                typeInfo.type = 'int';
                break;

            case 'tinyint':
                if (col.COLUMN_TYPE === 'tinyint(1)') {
                    typeInfo.type = 'bool';
                } else {
                    typeInfo.type = 'int';
                }
                break;

            case 'enum':
                let left = col.COLUMN_TYPE.indexOf('(');
                let right = col.COLUMN_TYPE.lastIndexOf(')');

                let typeName = table.TABLE_NAME + _.upperFirst(col.COLUMN_NAME);

                types[typeName] = {
                    type: 'enum',
                    values: col.COLUMN_TYPE.substring(left + 1, right).split(',').map(v => v.substr(1, v.length - 2))
                };

                typeInfo.type = typeName;

                break;

            case 'text':
                typeInfo.type = 'text';
                typeInfo.maxLength = col.CHARACTER_MAXIMUM_LENGTH;
                break;

            case 'datetime':
            case 'timestamp':
                typeInfo.type = 'datetime';
                break;

            default:
                throw new Error('To be implemented.');
        }

        return typeInfo;
    }

    _addReference(left, leftField, right, rightField) {
        let refs4LeftEntity = this._references[left];
        if (!refs4LeftEntity) {
            refs4LeftEntity = [];
            this._references[left] = refs4LeftEntity;
        }

        let found = _.find(refs4LeftEntity,
            item => (item.leftField === leftField && item.right === right && item.rightField === rightField)
        );

        if (found) {
            throw new Error(`The same reference already exist! From [${left}.${leftField}] to [${right}.${rightField}].`);
        }

        refs4LeftEntity.push({leftField, right, rightField});

        return this;
    }

    _getReferenceOfField(left, leftField) {
        let refs4LeftEntity = this._references[left];
        if (!refs4LeftEntity) {
            return undefined;
        }

        let reference = _.find(refs4LeftEntity,
            item => (item.leftField === leftField)
        );

        if (!reference) {
            return undefined;
        }

        return reference;
    }

    _hasReferenceOfField(left, leftField) {
        let refs4LeftEntity = this._references[left];
        if (!refs4LeftEntity) return false;

        return (undefined !== _.find(refs4LeftEntity,
            item => (item.leftField === leftField)
        ));
    }

    _getReferenceBetween(left, right) {
        let refs4LeftEntity = this._references[left];
        if (!refs4LeftEntity) {
            return undefined;
        }

        let reference = _.find(refs4LeftEntity,
            item => (item.right === right)
        );

        if (!reference) {
            return undefined;
        }

        return reference;
    }

    _hasReferenceBetween(left, right) {
        let refs4LeftEntity = this._references[left];
        if (!refs4LeftEntity) return false;

        return (undefined !== _.find(refs4LeftEntity,
            item => (item.right === right)
        ));
    }

    _featureReducer(entity, featureName, feature) {
        let field;

        switch (featureName) {
            case 'autoId':
                field = entity.fields[feature.field];

                if (field.type === 'int') {
                    field.autoIncrementId = true;
                    if ('startFrom' in field) {
                        this._events.on('setTableOptions:' + entity.name, extraOpts => {
                            extraOpts['AUTO_INCREMENT'] = field.startFrom;
                        });
                    }
                }
                break;

            case 'createTimestamp':
                field = entity.fields[feature.field];
                field.isCreateTimestamp = true;
                break;

            case 'updateTimestamp':
                field = entity.fields[feature.field];
                field.isUpdateTimestamp = true;
                break;

            case 'logicalDeletion':
                break;

            case 'atLeastOneNotNull':
                break;

            case 'validateAllFieldsOnCreation':
                break;
            
            case 'stateTracking':
                break;

            default:
                throw new Error('Unsupported feature "' + featureName + '".');
        }
    }

    _buildRelation(schema, relation) {
        this.logger.log('debug', 'Analyzing relation between ['
        + relation.left + '] and ['
        + relation.right + '] relationship: '
        + relation.relationship + ' ...');

        if (relation.relationship === 'n:n') {
            this._buildNToNRelation(schema, relation);
        } else if (relation.relationship === '1:n') {
            this._buildOneToAnyRelation(schema, relation, false);
        } else if (relation.relationship === '1:1') {
            this._buildOneToAnyRelation(schema, relation, true);
        } else if (relation.relationship === 'n:1') {
            this._buildManyToOneRelation(schema, relation);
        } else {
            console.log(relation);
            throw new Error('TBD');
        }
    }

    _buildManyToOneRelation(schema, relation) {
        let leftEntity = schema.entities[relation.left];
        let rightEntity = schema.entities[relation.right];

        let rightKeyInfo = rightEntity.getKeyField();
        let leftField = relation.leftField || MysqlModeler.foreignKeyFieldNaming(relation.right, rightEntity);

        leftEntity
            .addField(leftField, rightKeyInfo);

        this._addReference(relation.left, leftField, relation.right, rightEntity.key);
    }

    _buildOneToAnyRelation(schema, relation, unique) {
        let leftEntity = schema.entities[relation.left];
        let rightEntity = schema.entities[relation.right];

        let rightKeyInfo = rightEntity.getKeyField();
        let leftField = MysqlModeler.foreignKeyFieldNaming(relation.right, rightEntity);

        leftEntity.addField(leftField, rightKeyInfo);

        this._addReference(relation.left, leftField, relation.right, rightEntity.key);

        if (relation.multi && _.last(relation.multi) === relation.right) {
            
            this._events.on('afterRelationshipBuilding', () => {
                let index = {
                    fields: _.map(relation.multi, to => MysqlModeler.foreignKeyFieldNaming(to, schema.entities[to])),
                    unique: unique
                };

                leftEntity.addIndex(index);
            });
        }
    }

    _buildNToNRelation(schema, relation) {
        let relationEntityName = relation.left + inflection.camelize(inflection.pluralize(relation.right));

        if (schema.hasEntity(relationEntityName)) {
            let fullName = schema.entities[relationEntityName].id;

            throw new Error(`Entity [${relationEntityName}] conflicts with entity [${fullName}] in schema [${schema.name}].`);
        }

        this.logger.log('debug', `Create a relation entity for "${relation.left}" and "${relation.right}".`);
        
        let leftEntity = schema.entities[relation.left];
        let rightEntity = schema.entities[relation.right];
        
        let leftKeyInfo = leftEntity.getKeyField();
        let rightKeyInfo = rightEntity.getKeyField();
        
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

        let entity = new Entity(this.linker, relationEntityName, schema.oolModule, entityInfo);
        entity.link();
        entity.markAsRelationshipEntity();

        this._addReference(relationEntityName, leftField1, relation.left, leftEntity.key);
        this._addReference(relationEntityName, leftField2, relation.right, rightEntity.key);

        schema.addEntity(relationEntityName, entity);
    }   

    _createTableStatement(entityName, entity) {
        let sql = 'CREATE TABLE IF NOT EXISTS `' + entityName + '` (\n';

        //column definitions
        _.each(entity.fields, (field, name) => {
            sql += '  ' + MysqlModeler.quoteIdentifier(name) + ' ' + MysqlModeler.columnDefinition(entity, field) + ',\n';
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
        this._events.emit('beforeEndColumnDefinition:' + entityName, lines);
        if (lines.length > 0) {
            sql += '  ' + lines.join(',\n  ');
        } else {
            sql = sql.substr(0, sql.length-2);
        }

        sql += '\n)';

        //table options
        let extraProps = {};
        this._events.emit('setTableOptions:' + entityName, extraProps);
        let props = Object.assign({}, this._dbmsOptions.tableOptions, extraProps);

        sql = _.reduce(props, function(result, value, key) {
            return result + ' ' + key + '=' + value;
        }, sql);

        sql += ';\n';

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

    static columnDefinition(entity, field) {
        let sql;
        
        switch (field.type) {
            case 'int':
                sql = MysqlModeler.intColumnDefinition(field);
                break;

            case 'float':
            case 'decimal':
                sql =  MysqlModeler.floatColumnDefinition(field);
                break;

            case 'text':
                sql =  MysqlModeler.textColumnDefinition(field);
                break;

            case 'bool':
                sql =  MysqlModeler.boolColumnDefinition(field);
                break;

            case 'binary':
                sql =  MysqlModeler.binaryColumnDefinition(field);
                break;

            case 'datetime':
                sql =  MysqlModeler.datetimeColumnDefinition(field);
                break;

            case 'json':
                sql =  MysqlModeler.textColumnDefinition(field);
                break;

            case 'xml':
                sql =  MysqlModeler.textColumnDefinition(field);
                break;

            case 'enum':
                sql =  MysqlModeler.enumColumnDefinition(field);
                break;

            case 'csv':
                sql =  MysqlModeler.textColumnDefinition(field);
                break;

            default:
                throw new Error('Unsupported type "' + field.type + '".');
        }

        sql += this.columnNullable(field);
        sql += this.defaultValue(field);

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

        return sql;
    }

    static enumColumnDefinition(info) {
        return 'ENUM(' + _.map(info.values, (v) => MysqlModeler.quoteString(v)).join(', ') + ')';
    }

    static columnNullable(info) {
        if (info.hasOwnProperty('optional') && info.optional) {
            return ' NULL';
        }

        return ' NOT NULL';
    }

    static defaultValue(info) {
        if (info.isCreateTimestamp) {
            info.defaultByDb = true;
            return ' DEFAULT CURRENT_TIMESTAMP';
        }

        if (info.autoIncrementId) {
            info.defaultByDb = true;
            return ' AUTO_INCREMENT';
        }

        let sql = '';

        if (info.isUpdateTimestamp) {
            sql += ' ON UPDATE CURRENT_TIMESTAMP';
            info.updateByDb = true;
        }

        /*
        if (info.hasOwnProperty('default') && typeof info.default !== 'object') {
            let defaultValue = info.default;
            delete info.default;
            info.defaultByDb = true;

            if (info.type === 'bool') {
                if (_.isString(defaultValue)) {
                    sql += ' DEFAULT ' + (S(defaultValue).toBoolean() ? '1' : '0');
                } else {
                    sql += ' DEFAULT ' + (defaultValue ? '1' : '0');
                }
            } else if (info.type === 'int') {
                if (_.isInteger(defaultValue)) {
                    sql += ' DEFAULT ' + defaultValue.toString();
                } else {
                    sql += ' DEFAULT ' + parseInt(defaultValue).toString();
                }
            } else if (info.type === 'text') {
                sql += ' DEFAULT ' + Util.quote(defaultValue);
            } else if (info.type === 'float') {
                if (_.isNumber(defaultValue)) {
                    sql += ' DEFAULT ' + defaultValue.toString();
                } else {
                    sql += ' DEFAULT ' + parseFloat(defaultValue).toString();
                }
            } else if (info.type === 'binary') {
                sql += ' DEFAULT ' + Util.bin2Hex(defaultValue);
            } else if (info.type === 'datetime') {
                if (_.isInteger(defaultValue)) {
                    sql += ' DEFAULT ' + defaultValue.toString();
                } else {
                    sql += ' DEFAULT ' + Util.quote(defaultValue);
                }
            } else if (info.type === 'json') {
                if (typeof defaultValue === 'string') {
                    sql += ' DEFAULT ' + Util.quote(defaultValue);
                } else {
                    sql += ' DEFAULT ' + Util.quote(JSON.stringify(defaultValue));
                }
            } else if (info.type === 'xml' || info.type === 'enum' || info.type === 'csv') {
                sql += ' DEFAULT ' + Util.quote(defaultValue);
            } else {
                throw new Error('Unexpected path');
            }
        }        
        */
        
        return sql;
    }
}

module.exports = MysqlModeler;