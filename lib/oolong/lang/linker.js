"use strict";

const co = require('co');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const glob = require('glob');

const Schema = require('./schema');
const Entity = require('./entity');
const Oolong = require('./oolong');
const OolUtil = require('./ool-utils.js');

const OolongParser = Oolong.parser;

class Linker {
    constructor(context, options) {
        this.logger = context.logger;

        this.options = Object.assign({oolPath: './oolong'}, options);
        this.options.oolPath = path.resolve(this.options.oolPath);

        this.oolModules = {};
        this.schemas = undefined;
        this.databases = undefined;

        this.entityCache = {};
        this.typeCache = {};
    }

    log(level, message, data) {
        if (data) {
            this.logger.log(level, message, data);
        } else {
            this.logger.log(level, message);
        }
    }

    isModuleLoaded(modulePath) {
        return modulePath in this.oolModules;
    }

    getModule(modulePath) {
        return this.oolModules[modulePath];
    }

    link(entryFileName) {
        //compile entry file
        let entryFile = path.resolve(this.options.oolPath, `${entryFileName}.ool`);
        let entryModule = this.loadModule(entryFile);

        if (!entryModule) {
            throw new Error(`Cannot resolve file "${entryFile}".`);
        }

        if (!entryModule.schema) {
            throw new Error('No schema defined in entry file.');
        }

        this.databases = entryModule.database;

        this.schemas = _.reduce(entryModule.schema, (result, schema, schemaName) => {
            result[schemaName] = (new Schema(this, schemaName, entryModule, schema)).init();
            return result;
        }, {});        

        this.addRelatedEntities();
        
        return this;
    }

    addRelatedEntities() {
        this.log('debug', 'Finding referenced entities ...');

        //using bfs to find all connected entities
        let nodes = {}, beReferenced = {};

        const extractNodesByRelation = (ool, relationInfo, leftEntity, rightName, extraRelationOpt) => {
            let rightEntity = this.loadEntity(ool, rightName);
            let relation = Object.assign({}, relationInfo, {left: leftEntity, right: rightEntity}, extraRelationOpt);
            let leftPayload = {to: rightEntity.id, by: relation};

            if (!nodes[leftEntity.id]) {
                nodes[leftEntity.id] = [leftPayload];
            } else {
                nodes[leftEntity.id].push(leftPayload);
            }

            if (!beReferenced[rightEntity.id]) {
                beReferenced[rightEntity.id] = [leftEntity.id];
            } else {
                beReferenced[rightEntity.id].push(leftEntity.id);
            }

            return rightEntity;
        };
        
        //construct the connection status of nodes
        _.each(this.oolModules, ool => {
            if (ool.relation) {
                
                ool.relation.forEach(r => {
                    let leftEntity = this.loadEntity(ool, r.left);
                    
                    if (_.isObject(r.right)) {
                        
                        if (r.type === 'chain') {
                            _.each(r.right, (rightOpt, rightName) => {
                                leftEntity = extractNodesByRelation(ool, r, leftEntity, rightName, rightOpt);
                            });
                        } else  if (r.type === 'multi') {                            
                            _.each(r.right, rightName => {
                                extractNodesByRelation(ool, r, leftEntity, rightName, { multiGroup: r.right });
                            });
                        }
                    } else {
                        extractNodesByRelation(ool, r, leftEntity, r.right);
                    }                   
                });
            }            
        });        

        //starting from schema to add all referenced entities
        _.each(this.schemas, (schema) => {
            let pending = new Set(), visited = new Set();
            
            Object.keys(schema.entityIdMap).forEach(id => pending.add(id));

            while (pending.size > 0) {
                let expanding = pending;
                pending = new Set();

                expanding.forEach(id => {
                    if (visited.has(id)) return;

                    let connections = nodes[id];

                    if (connections) {
                        connections.forEach(c => {
                            pending.add(c.to);
                            schema.addRelation(c.by);
                        });
                    }
                    
                    visited.add(id);
                });
            }
        });  
        
        //finding the single way relation chain
    }
    
    loadModule(modulePath) {
        modulePath = path.resolve(modulePath);

        if (this.isModuleLoaded(modulePath)) {
            return this.getModule(modulePath);
        }

        if (!fs.existsSync(modulePath)) {
            return undefined;
        }

        let ool = this.compile(modulePath);

        return (this.oolModules[modulePath] = ool);
    }

    loadEntity(oolModule, entityName) {
        let entityRefId = entityName + '@' + oolModule.id;
        if (entityRefId in this.entityCache) {
            return this.entityCache[entityRefId];
        }

        //console.log(entityName);

        let moduleName = undefined;

        if (OolUtil.isMemberAccess(entityName)) {
            let n = entityName.split('.');
            moduleName = n[0];
            entityName = n[1];
        }

        let entityModule;
        
        this.log('debug','Loading entity: ' + entityName);

        let index = _.findLastIndex(oolModule.namespace, ns => {
            let modulePath = moduleName ?
                path.join(ns, moduleName + '.ool') :
                ns + '.ool';

            this.log('debug', 'Searching: ' + modulePath);

            entityModule = this.loadModule(modulePath);

            return entityModule && entityModule.entity && (entityName in entityModule.entity);
        });

        if (index === -1) {
            throw new Error(`Entity reference "${entityName}" not found in "${oolModule.id}".`);
        }

        let entity = entityModule.entity[entityName];
        if (!(entity instanceof Entity)) {
            entity = (new Entity(this, entityName, entityModule, entity)).init();
            entityModule.entity[entityName] = entity;
        }

        this.entityCache[entityRefId] = entity;
        
        this.log('debug', 'Loaded entity [' + entity.name + ']:\n' + JSON.stringify(entity, null, 4));
        
        return entity;
    }

    loadType(oolModule, typeName) {
        let typeRefId = typeName + '@' + oolModule.id;
        if (typeRefId in this.typeCache) {
            return this.typeCache[typeRefId];
        }

        let moduleName = undefined;

        if (OolUtil.isMemberAccess(typeName)) {
            let n = typeName.split('.');
            moduleName = n[0];
            typeName = n[1];
        }

        let typeModule;

        this.log('debug', 'Loading type: ' + typeName);

        let index = _.findLastIndex(oolModule.namespace, ns => {
            let modulePath = moduleName ?
                path.join(ns, moduleName + '.ool') :
                ns + '.ool';

            this.log('debug', 'Searching: ' + modulePath);

            typeModule = this.loadModule(modulePath);

            return typeModule && typeModule.type && (typeName in typeModule.type);
        });

        if (index === -1) {
            throw new Error(`Type reference "${typeName}" not found in "${oolModule.id}".`);
        }

        let result = { oolModule: typeModule, name: typeName };

        this.typeCache[typeRefId] = result;

        return result;
    }

    trackBackType(oolModule, info) {
        if (Oolong.BUILTIN_TYPES.has(info.type)) {
            return info;
        }

        let baseType = this.loadType(oolModule, info.type);
        let baseInfo = baseType.oolModule.type[baseType.name];

        if (!Oolong.BUILTIN_TYPES.has(baseInfo.type)) {
            //the base type is not a builtin type
            baseInfo = this.trackBackType(baseType.oolModule, baseInfo);
            baseType.oolModule.type[baseType.name] = baseInfo;
        }

        let derivedInfo = Object.assign({}, baseInfo, _.omit(info, 'type'));
        if (!derivedInfo.subClass) {
            derivedInfo.subClass = [];
        }
        derivedInfo.subClass.push(info.type);
        return derivedInfo;
    }

    compile(oolFile) {
        this.log('debug', 'Compiling ' + oolFile + ' ...');

        let coreEntitiesPath = path.resolve(__dirname, 'core', 'entities');
        let oolongEntitiesPath = path.join(coreEntitiesPath, 'oolong');
        let isCoreEntity = _.startsWith(oolFile, coreEntitiesPath);
        
        oolFile = path.resolve(oolFile);
        let ool = OolongParser.parse(fs.readFileSync(oolFile, 'utf8'));

        if (!ool) {
            throw new Error('Error occurred while compiling.');
        }

        let namespace;

        if (!_.startsWith(oolFile, oolongEntitiesPath)) {
            //Insert core entities path into namespace
            //let files = glob.sync(path.join(__dirname, 'core/entities', '*.ool'), {nodir: true});
            namespace = [ oolongEntitiesPath ];
        } else {
            namespace = [];
        }

        let currentPath = path.dirname(oolFile);

        if (ool.namespace) {
            ool.namespace.forEach(ns => {
                let p = path.resolve(currentPath, ns);
                if (!fs.existsSync(p) && !fs.existsSync(p+'.ool')) {
                    p = path.join(coreEntitiesPath, ns);

                    if (!fs.existsSync(p) && !fs.existsSync(p+'.ool')) return;
                }

                if (namespace.indexOf(p) == -1) {
                    namespace.push(p);
                }
            });
        }

        if (namespace.indexOf(currentPath) == -1) {
            namespace.push(currentPath);
        }

        let baseName = path.basename(oolFile, '.ool');
        let pathWithoutExt = path.join(currentPath, baseName);

        if (namespace.indexOf(pathWithoutExt) == -1) {
            namespace.push(pathWithoutExt);
        }

        ool.id = isCoreEntity
            ? path.relative(coreEntitiesPath, pathWithoutExt)
            : './' + path.relative(this.options.oolPath, pathWithoutExt);
        ool.namespace = namespace;
        ool.name = baseName;
        ool.path = currentPath;

        //let jsFile = oolFile + '.json';
        //fs.writeJsonSync(jsFile, ool);

        return ool;
    }
}

module.exports = Linker;