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
        this.mowa = [];
    }    
    
    enqueueComponents(components) {
        this.components = this.components.concat(components);
    }

    enqueueProjectDeploy(mowa) {
        this.mowa = this.mowa.concat(mowa);
    }
    
    async execute_() {
        this.manager.logger.info(`Executing task list on node [${this.nodeName}] ...`);

        let session = await this.manager.getSession_(this.nodeName);

        let tasks = [];

        Util._.each(this.components, componentInfo => {
            tasks.push(() => this._getDeployer(session, componentInfo).deploy_(this.manager.reinstallExistingComponent));
        });

        await Util.eachPromise_(tasks);

        await Util.eachAsync_(this.mowa, async projectInfo => {
            if (!projectInfo.projectRoot) {
                return Promise.reject('"projectRoot" is required!');
            }

            if (!projectInfo.bundleVersion) {
                return Promise.reject('"bundleVersion" is required!');
            }

            const pkg = require(path.join(this.manager.api.base, 'package.json'));
            const bundleName = pkg.name + '-' + Util.S(projectInfo.bundleVersion).replaceAll('.', '_').s + '.zip';
            const bundlePath = path.join(this.manager.api.base, 'release', bundleName);
            if (!Util.fs.existsSync(bundlePath)) {
                return Promise.reject(`Specified bundle "${bundleName}" does not exist!`);
            }

            let result = await session.ssh.execCommand(`mkdir -p ${projectInfo.projectRoot}`);
            if (result.code !== 0) {
                return Promise.reject('Failed to create project root folder: ' + projectInfo.projectRoot);
            }

            await session.ssh.putFile(bundlePath, path.join(projectInfo.projectRoot, bundleName));

            this.manager.logger.info(`Project bundle "${bundleName}" successfully uploaded.`);
        });

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
