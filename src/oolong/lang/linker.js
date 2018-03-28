"use strict";

const path = require('path');
const Util = require('../../util.js');

const co = Util.co;
const fs = Util.fs;
const _ = Util._;
const glob = Util.glob;

const Schema = require('./schema.js');
const Entity = require('./entity.js');
const Oolong = require('./oolong.js');
const OolUtil = require('./ool-utils.js');

const OolongParser = Oolong.parser;

class OolongLinker {
    /**
     * Linker of oolong DSL
     *
     * @constructs OolongLinker
     *
     * @param {object} context
     * @property {Logger} context.logger - Logger object
     * @property {AppModule} context.currentApp - Current app module
     */
    constructor(context) {
        /**
         * Logger
         * @type {Logger}
         * @public
         */
        this.logger = context.logger;

        /**
         * Current app module
         * @type {AppModule}
         * @public
         */
        this.currentAppModule = context.currentApp;

        /**
         * Linked schema
         * @type {object}
         * @public
         */
        this.schema = undefined;

        /**
         * Parsed oolong files, path => module
         * @type {object}
         * @private
         */
        this._oolModules = {};

        /**
         * Entities cache
         * @type {object}
         * @private
         */
        this._entityCache = {};

        /**
         * Types cache
         * @type {object}
         * @private
         */
        this._typeCache = {};
    }

    /**
     * Write log
     * @param {string} level
     * @param {string} message
     * @param {object} [data]
     */
    log(level, message, data) {
        if (data) {
            this.logger.log(level, message, data);
        } else {
            this.logger.log(level, message);
        }
    }

    /**
     * Check whether a module is loaded
     * @param {string} modulePath
     * @returns {boolean}
     */
    isModuleLoaded(modulePath) {
        return modulePath in this._oolModules;
    }

    /**
     * Get a loaded oolone module
     * @param {string} modulePath
     * @returns {*}
     */
    getModule(modulePath) {
        return this._oolModules[modulePath];
    }

    /**
     * Start linking oolong files
     * @param {string} entryFileName
     * @returns {OolongLinker}
     */
    link(entryFileName) {
        //compile entry file
        let entryFile = path.resolve(this.currentAppModule.oolongPath, `${entryFileName}`);
        let entryModule = this.loadModule(entryFile);

        if (!entryModule) {
            throw new Error(`Cannot resolve file "${entryFile}".`);
        }

        if (!entryModule.schema) {
            throw new Error('No schema defined in entry file.');
        }

        if (entryModule.schema.name !== entryModule.name) {
            throw new Error(`Schema "${entryModule.schema.name}" defined in "${entryFileName}" should be the same with filename.`);
        }

        this.schema = new Schema(this, entryModule);
        this.schema.link();

        this._addRelatedEntities();
        
        return this;
    }

    /**
     * Load a oolong module
     * @param {string} modulePath
     * @returns {*}
     */
    loadModule(modulePath) {
        modulePath = path.resolve(modulePath);

        if (this.isModuleLoaded(modulePath)) {
            return this.getModule(modulePath);
        }

        if (!fs.existsSync(modulePath)) {
            return undefined;
        }

        let ool = this._compile(modulePath);

        return (this._oolModules[modulePath] = ool);
    }

    /**
     * Load an entity from a oolong module
     * @param {*} oolModule
     * @param {string} entityName
     * @returns {*}
     */
    loadEntity(oolModule, entityName) {
        let entityRefId = entityName + '@' + oolModule.id;
        if (entityRefId in this._entityCache) {
            return this._entityCache[entityRefId];
        }

        let moduleName = undefined;

        if (OolUtil.isMemberAccess(entityName)) {
            let n = entityName.split('.');
            moduleName = n[0];
            entityName = n[1];
        }

        let entityModule;
        
        this.log('debug','Loading entity: ' + entityName);
        //this.log('debug', oolModule.name);
        //this.log('debug', oolModule.namespace.join('\n'));

        let index = _.findLastIndex(oolModule.namespace, ns => {
            let modulePath;

            if (ns.endsWith('*')) {
                if (moduleName) {
                    modulePath = path.join(ns.substr(0, -1), moduleName + '.ool');
                } else {
                    return undefined;
                }
            } else {
                modulePath = moduleName ?
                    path.join(ns, moduleName + '.ool') :
                    ns + '.ool';
            }

            this.log('debug', 'Searching: ' + modulePath);

            entityModule = this.loadModule(modulePath);

            return entityModule && entityModule.entity && (entityName in entityModule.entity);
        });

        if (index === -1) {
            throw new Error(`Entity reference "${entityName}" in "${oolModule.id}" not found.`);
        }

        let entity = entityModule.entity[entityName];
        if (!(entity instanceof Entity)) {
            entity = (new Entity(this, entityName, entityModule, entity)).link();
            entityModule.entity[entityName] = entity;
        }

        this._entityCache[entityRefId] = entity;
        
        //this.log('debug', 'Loaded entity [' + entity.name + ']:\n' + JSON.stringify(entity, null, 4));
        
        return entity;
    }

    /**
     * Load a type definition
     * @param {*} oolModule
     * @param {string} typeName
     * @returns {object}
     */
    loadType(oolModule, typeName) {
        let typeRefId = typeName + '@' + oolModule.id;
        if (typeRefId in this._typeCache) {
            return this._typeCache[typeRefId];
        }

        let moduleName = undefined;

        if (OolUtil.isMemberAccess(typeName)) {
            let n = typeName.split('.');
            moduleName = n[0];
            typeName = n[1];
        }

        let typeModule;

        this.log('debug', 'Loading type: ' + typeName);

        //this.log('debug', oolModule.name);
        //this.log('debug', oolModule.namespace.join('\n'));

        let index = _.findLastIndex(oolModule.namespace, ns => {
            let modulePath;

            if (ns.endsWith('*')) {
                if (moduleName) {
                    modulePath = path.join(ns.substr(0, -1), moduleName + '.ool');
                } else {
                    return undefined;
                }
            } else {
                modulePath = moduleName ?
                    path.join(ns, moduleName + '.ool') :
                ns + '.ool';
            }

            this.log('debug', 'Searching: ' + modulePath);

            typeModule = this.loadModule(modulePath);

            return typeModule && typeModule.type && (typeName in typeModule.type);
        });

        if (index === -1) {
            throw new Error(`Type reference "${typeName}" in "${oolModule.id}" not found.`);
        }

        let result = { oolModule: typeModule, name: typeName };

        this._typeCache[typeRefId] = result;

        return result;
    }

    /**
     * Track back the type derived chain
     * @param {*} oolModule
     * @param {object} info
     * @returns {object}
     */
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

    _compile(oolFile) {
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

        function expandNs(namespaces, ns, recursive) {
            if (ns.endsWith('.ool')) {
                namespaces.push(ns.substr(0, ns.length-4));
                return;
            }

            if (fs.existsSync(ns + '.ool')) {
                namespaces.push(ns);
                return;
            }

            if (fs.statSync(ns).isDirectory()) {
                namespaces.push(path.join(ns, '*'));

                if (recursive) {
                    let files = fs.readdirSync(ns);
                    files.forEach(f => expandNs(namespaces, path.join(ns, f), true));
                }
            }
        }

        if (ool.namespace) {
            ool.namespace.forEach(ns => {
                let p;

                if (ns.endsWith('/*')) {
                    p = path.resolve(currentPath, ns.substr(0, ns.length - 2));
                    let files = fs.readdirSync(p);
                    files.forEach(f => expandNs(namespace, path.join(p, f), false));
                } else if (ns.endsWith('/**')) {
                    p = path.resolve(currentPath, ns.substr(0, ns.length - 3));
                    let files = fs.readdirSync(p);
                    files.forEach(f => expandNs(namespace, path.join(p, f), true));
                } else {
                    expandNs(namespace, path.resolve(currentPath, ns));
                }
            });
        }

        let currentNamespace = path.join(currentPath, '*');

        if (namespace.indexOf(currentNamespace) == -1) {
            namespace.push(currentNamespace);
        }

        let baseName = path.basename(oolFile, '.ool');
        let pathWithoutExt = path.join(currentPath, baseName);

        if (namespace.indexOf(pathWithoutExt) == -1) {
            namespace.push(pathWithoutExt);
        }

        ool.id = isCoreEntity
            ? path.relative(coreEntitiesPath, oolFile)
            : './' + path.relative(this.currentAppModule.oolongPath, oolFile);
        ool.namespace = namespace;
        ool.name = baseName;
        ool.path = currentPath;

        let jsFile = oolFile + '.json';
        fs.writeFileSync(jsFile, JSON.stringify(ool, null, 4));

        return ool;
    }

    _addRelatedEntities() {
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
        _.each(this._oolModules, ool => {
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
                                extractNodesByRelation(ool, r, leftEntity, rightName, { multi: r.right });
                            });
                        }
                    } else {
                        extractNodesByRelation(ool, r, leftEntity, r.right);
                    }
                });
            }
        });

        //starting from schema to add all referenced entities
        let pending = new Set(), visited = new Set();

        Object.keys(this.schema.entityIdMap).forEach(id => pending.add(id));

        while (pending.size > 0) {
            let expanding = pending;
            pending = new Set();

            expanding.forEach(id => {
                if (visited.has(id)) return;

                let connections = nodes[id];

                if (connections) {
                    connections.forEach(c => {
                        pending.add(c.to);
                        this.schema.addRelation(c.by);
                    });
                }

                visited.add(id);
            });
        }

        //finding the single way relation chain
    }
}

module.exports = OolongLinker;