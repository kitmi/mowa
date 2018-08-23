"use strict";

const path = require('path');

const Util = require('../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

const Ssh = require('node-ssh');
const TaskList = require('./tasklist.js');
const Setup = require('./setup.js');

let componentsCache = undefined;

function loadComponentsCache() {
    let componentsPath = path.resolve(__dirname, 'components');
    let cache = {};

    let files = Util.glob.sync(path.join(componentsPath, '*.js'), {nodir: true});

    files.forEach(f => {
        let c = require(f);
        cache[c.componentType] = c;
    });

    return cache;
}

const $sshExecWithBashrc = ssh => async (cmd) => {
    return await ssh.execCommand("PS1='\\u@\\h:\\w\\$ ' source ~/.bashrc > /dev/null 2>&1; " + cmd, {options: { pty: true }});
};

class Manager {
    static getAvailableComponents() {
        if (componentsCache) {
            return Object.keys(componentsCache);
        }

        componentsCache = loadComponentsCache();

        return Object.keys(componentsCache);
    }

    static getComponent(name) {
        if (!componentsCache) {
            componentsCache = loadComponentsCache();
        }

        let c = componentsCache[name];
        if (!c) {
            throw new Error(`Component "${name}" not exists!`);
        }

        return c;
    }

    constructor(api, reinstall) {
        this.api = api;
        this.logger = this.api.logger;
        this.config = this.api.config.deploy;

        this.sessionPool = {};
        this.targetNodes = {};
        this.deployed = {};

        this.reinstallExistingComponent = reinstall;
    }

    async run_() {
        this.logger.info('Start deployment process ...');

        let nodesSetup = [];

        Util._.forOwn(this.config.topology, (deploySetting, nodesRole) => {

            Util._.each(deploySetting.nodes, nodeName => {
                if (deploySetting.setup) {
                    nodesSetup.push(this._setupNode_(nodeName, deploySetting.setup, deploySetting.sudo));
                }

                let taskList = this._getNodeTaskList(nodeName);
                taskList.enqueueComponents(deploySetting.components);
                taskList.enqueueProjectDeploy(deploySetting.mowa);
            });
        });

        let doComponentDeployJobs = Util._.map(this.targetNodes, taskList => () => taskList.execute_());

        return Promise.all(nodesSetup).then(() => Util.eachPromise_(doComponentDeployJobs)).finally(() => {
            let disposeWorks = Util._.map(this.sessionPool, session => session.ssh.dispose());
            return Promise.all(disposeWorks);
        });
    }
    
    getComponentSetting(componentName) {
        return Util.getValueByPath(this.config.components, componentName);
    }

    isComponentDeployedOnNode(nodeName, componentType) {
        return this.deployed[nodeName] && this.deployed[nodeName][componentType]
            && this.deployed[nodeName][componentType].length > 0;
    }

    reportComponentDeployedOnNode(nodeName, componentType, componentName) {
        Util.putIntoBucket(this.deployed, `${nodeName}.${componentType}`, componentName);
    }

    async getSession_(nodeName) {
        let session = this.sessionPool[nodeName];
        if (!session) {
            let nodeInfo = this.config.nodes[nodeName];
            if (!nodeInfo) {
                return Promise.reject(`Node [${nodeName}] not found in configuration.`);
            }

            let ssh = new Ssh();
            session = {
                name: nodeName,
                nodeInfo: nodeInfo,
                ssh,
                exec: $sshExecWithBashrc(ssh)
            };

            await ssh.connect(nodeInfo);
            this.logger.info('Connected to: ' + nodeInfo.host);

            //Get OS information
            let result = await ssh.execCommand('lsb_release -a');
            if (result.code !== 0) {
                return Promise.reject(`Unable to detect the OS type of node [${nodeInfo.host}].`);
            }

            //Distributor ID: 'Ubuntu',
            //Description: 'Ubuntu 16.04.3 LTS',
            //Release: '16.04',
            //Codename: 'xenial'
            let os = {};

            result.stdout.split('\n').forEach(line => {
                if (line.indexOf(':') > 0) {
                    let [k, v] = line.split(':');
                    os[k.trim()] = v.trim();
                }
            });

            session['os'] = os;

            //Get processor type
            result = await ssh.execCommand('uname -m');
            if (result.code !== 0) {
                return Promise.reject(`Unable to detect the processor type of node [${nodeInfo.host}].`);
            }

            //x86_64
            session['processorType'] = result.stdout;

            result = await session.exec("export");
            this.logger.verbose(result.stdout);

            this.sessionPool[nodeName] = session;
        }

        return session;
    }

    async _setupNode_(nodeName, settings, sudo) {
        let doSetupJobs = [];

        _.forOwn(settings, (itemConfig, setupItem) => {
            let jobMethod = setupItem + '_';

            if (!(jobMethod in Setup)) {
                throw new Error('Unsupported setup item: ' + setupItem);
            }

            doSetupJobs.push(() => this.getSession_(nodeName).then(session => Setup[jobMethod](session, itemConfig, this.logger, sudo)));
        });

        return Util.eachPromise_(doSetupJobs);
    }
    
    _getNodeTaskList(nodeName) {
        let list = this.targetNodes[nodeName];
        if (!list) {
            list = new TaskList(this, nodeName);
            this.targetNodes[nodeName] = list;
        }

        return list;
    }    
}

module.exports = Manager;