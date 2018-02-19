"use strict";

const Util = require('../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

class ComponentBase {
    constructor(manager, session, instanceName, options) {
        this.manager = manager;
        this.session = session;
        this.instanceName = instanceName;
        this.fullName = this.constructor.componentType + '.' + instanceName;
        this.options = options;
    }

    async deploy_(reinstall) {
        this.manager.logger.info(`Deploying component "${this.fullName}" to [${this.session.name}] ...`);

        let deployed = await this.test_().then(({ installed, started }) => {
            if (!reinstall) {
                if (started) {
                    this.manager.logger.warn(`Since component "${this.fullName}" is already installed and started, the deployment process is skipped.`);

                    return true;
                } else if (installed) {
                    this.manager.logger.warn(`Since component "${this.fullName}" is already installed, the installation process is skipped.`);
                    if (this.options.startAfterInstall) {
                        return this.start_().then(() => this.test_(true)).then(({started}) => started);
                    }

                    return true;
                }
            }

            let job = Promise.resolve();

            if (installed) {
                this.manager.logger.warn(`The component "${this.fullName}" is already installed and will be uninstalled first.`);
                job = job.then(() => this.uninstall_());
            }

            job = job.then(() => this.install_());

            if (this.options.startAfterInstall) {
                job = job.then(() => this.start_());
            }

            job = job.then(() => this.test_(true));

            return job.then(({installed, started}) => (this.options.startAfterInstall && started) || installed);
        });

        if (deployed) {
            this.manager.reportComponentDeployedOnNode(this.session.name, this.constructor.componentType, this.instanceName);
            this.manager.logger.info(`Component "${this.fullName}" is deployed successfully on [${this.session.name}].`);
        } else {
            return Promise.reject(`Failed to deploy component "${this.fullName}"!`);
        }
    }

    async test_() {
        this.manager.logger.info(`Checking the status of component "${this.fullName}" ...`);

        return this.doTest_();
    }

    async install_() {
        this.manager.logger.info(`Installing component "${this.fullName}" ...`);

        if (!_.isEmpty(this.constructor.dependencies)) {
            this.manager.logger.info(`Checking dependencies of component "${this.fullName}" ...`);

            _.each(this.constructor.dependencies, dep => {
                if (!this.manager.isComponentDeployedOnNode(this.session.name, dep)) {
                    throw new Error(`One of the dependency "${dep}" of component "${this.fullName}" is not installed.`);
                }

                this.manager.logger.verbose(`Component "${dep}" ... [OK]`);
            });
        }

        return this.doInstall_();
    }

    async uninstall_() {
        this.manager.logger.info(`Uninstalling component "${this.fullName}" ...`);

        await this.test_().then(({started}) => {
            if (started) {
                this.manager.logger.info(`Component "${this.fullName}" is running and will be stopped first.`);
                return this.stop_();
            }
        }).then(() => this.doUninstall_());
    }

    async start_() {
        this.manager.logger.info(`Starting component "${this.fullName}" ...`);

        return this.doStart_();
    }

    async stop_() {
        this.manager.logger.info(`Stopping component "${this.fullName}" ...`);

        return this.doStop_();
    }

    async _ssh_(cmd, throwOnError = true) {
        this.manager.logger.verbose('exec => ' + cmd);

        return this.session.ssh.execCommand(cmd).then(result => {
            if (result.code !== 0 && throwOnError) {
                return Promise.reject(`Remote ssh command error: ${result.stderr}`);
            }

            this.manager.logger.verbose(result.stdout);
            return result.stdout;
        });
    }
    
    async _sshReconnect_() {
        await this.session.ssh.dispose();
        await this.session.ssh.connect(this.session.nodeInfo);
        this.manager.logger.info(`Session for node "${this.session.name}" reconnected.`);
    }
}

module.exports = ComponentBase;