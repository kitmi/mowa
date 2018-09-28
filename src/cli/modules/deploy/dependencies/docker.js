"use strict";

const U = require('rk-utils');
const _ = U._;
const path = require('path');
const compareVersions = require('compare-versions');

let self = module.exports = {
    
    ensureReady_: function (session, leastVersion, logger) {
        logger.info('Checking dependency Docker ...');

        return session.ssh.execCommand('docker -v').then(result => {
            if (result.code !== 0) {
                logger.warn('Docker is not installed.');

                return self.install_(session, logger);

            } else if (leastVersion) {
                let match = result.stdout.match(/^Docker version\s(.+?),.*/);
                if (!_.isEmpty(match) && match.length > 1) {
                    let version = match[1];
                    if (compareVersions(version, leastVersion) < 0) {
                        logger.warn('The version of installed Docker does not meet the requirement.');

                        return self.uninstall_(session, logger).then(() => self.install_(session, logger));
                    }
                }
            }

            logger.verbose(result.stderr);
            logger.info('Docker exists.');
        });
    },

    install_: function (session, logger) {
        logger.info('Installing Docker ...');

        let dist = U.pascalCase(session.os['Distributor ID']);
        let osSpecificFile = path.resolve(__dirname, 'docker-' + dist + '.js');
        let osSpecificObj;

        try {
            osSpecificObj = require(osSpecificFile);
        } catch (error) {
            logger.error(error);
        }

        if (!osSpecificObj) {
            return Promise.reject('Unsupported target OS: ' + dist);
        }

        return osSpecificObj.install_(session, logger);
    },

    uninstall_: function (session, logger) {
        logger.info('Uninstalling Docker ...');

        let dist = U.pascalCase(session.os['Distributor ID']);
        let osSpecificFile = path.resolve(__dirname, 'docker-' + dist + '.js');
        let osSpecificObj;

        try {
            osSpecificObj = require(osSpecificFile);
        } catch (error) {
            logger.error(error);
        }

        if (!osSpecificObj) {
            return Promise.reject('Unsupported target OS: ' + dist);
        }

        return osSpecificObj.uninstall_(session, logger);
    },

    pullImage_: function (session, imageName, logger) {
        return session.ssh.execCommand(`sudo docker pull ${imageName}`).then(result => {
            if (result.code !== 0)
                return Promise.reject(`Failed to download docker image: ${imageName}.\nError: ${result.stderr}`);

            logger.verbose(result.stdout);

            if (result.stdout.indexOf('up to date') > 0) {
                logger.info(`Docker image [${imageName}] exists and is up to date. Skipped download.`);
            } else {
                logger.info(`Docker image [${imageName}] is downloaded successfully.`);
            }
        });
    },

    isRunning_: function (session, containerName, logger) {
        return session.ssh.execCommand(
            `sudo docker ps --filter "name=${containerName}" | grep ${containerName}`).then(result => {
            if (result.code !== 0) {
                logger.info(`Docker container [${containerName}] is not running.`);
                return false;
            }

            logger.verbose(result.stdout);
            logger.info(`Docker container [${containerName}] is running.`);
            return true;
        });
    },

    hasContainer_: function (session, containerName, logger) {
        return session.ssh.execCommand(
            `sudo docker ps -a --filter "name=${containerName}" | grep ${containerName}`).then(result => {
            if (result.code !== 0) {
                logger.info(`Docker container [${containerName}] does not exist.`);
                return false;
            }

            logger.verbose(result.stdout);
            logger.info(`Docker container [${containerName}] exists.`);
            return true;
        });
    },

    runImage_: function (session, imageName, containerName, options, cmd, logger) {
        return session.ssh.execCommand(
            `sudo docker run -d --name ${containerName}${options} ${imageName} ${cmd}`).then(result => {
            if (result.code !== 0)
                return Promise.reject(`Failed to run docker image: ${imageName}.\nError: ${result.stderr}`);

            logger.verbose(result.stdout);
            logger.info(`Docker image [${imageName}] runs as [${containerName}] successfully.`);
        });
    },

    stopContainer_: function (session, containerName, options, logger) {
        return session.ssh.execCommand(`sudo docker stop${options} ${containerName}`).then(result => {
            if (result.code !== 0)
                return Promise.reject(`Failed to stop docker container: ${containerName}.\nError: ${result.stderr}`);

            logger.verbose(result.stdout);
            logger.info(`Docker container [${containerName}] is stopped.`);
        });
    },

    removeContainer_: function (session, containerName, options, logger) {
        return session.ssh.execCommand(`sudo docker rm${options} ${containerName}`).then(result => {
            if (result.code !== 0)
                return Promise.reject(`Failed to remove docker container: ${containerName}.\nError: ${result.stderr}`);

            logger.verbose(result.stdout);
            logger.info(`Docker container [${containerName}] is removed.`);
        });
    },

    makeOptions: function (optionsArray) {
        if (_.isEmpty(optionsArray)) return '';

        if (typeof optionsArray === 'string') return ' ' + optionsArray;

        return ' ' + _.map(optionsArray, option => {
            if (typeof option === 'string') {
                if (option.length === 1) {
                    return '-' + option;
                }
                return '--' + option;
            }

            if (option.key.length === 1) {
                return '-' + option.key + ' ' + option.value;
            }

            return '--' + option.key + ' ' + option.value;
        }).join(' ');
    }
};