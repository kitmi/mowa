"use strict";

const path = require('path');

const Util = require('../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

class TaskList {    
    constructor(manager, nodeName) {
        this.manager = manager;
        this.nodeName = nodeName;
        this.components = [];
        this.apps = [];
    }    
    
    enqueueComponents(components) {
        this.components = this.components.concat(components);
    }
    
    async execute_() {
        this.manager.logger.info(`Executing task list on node [${this.nodeName}] ...`);

        let session = await this.manager.getSession_(this.nodeName);

        let componentsDeploy = [];

        Util._.each(this.components, componentInfo => {
            componentsDeploy.push(() => this._getDeployer(session, componentInfo).deploy_(this.manager.reinstallExistingComponent));
        });

        await Util.eachPromise_(componentsDeploy);

        this.manager.logger.info(`All deployment tasks for node [${this.nodeName}] are completed successully.`);
    }

    _getDeployer(session, component) {
        let componentConfig = this.manager.getComponentSetting(component.name);
        if (!componentConfig) {
            throw new Error(`Component [${component.name}] not found in configuration.`);
        }

        let [ typeOfDeployer, instanceName ] = component.name.split('.');

        let Deployer = require(path.resolve(__dirname, './components', Util.S(typeOfDeployer).camelize().s + '.js'));
        return new Deployer(this.manager, session, instanceName, Object.assign({}, componentConfig, component.overrides));
    }
}

module.exports = TaskList;
