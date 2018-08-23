"use strict";

const Util = require('../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

const MowaHelper = require('../../mowa-helper.js');
const DeployManager = require('./manager.js');

/**
 * @module MowaCLI_Deploy
 * @summary Deploy module of Mowa CLI program.
 */



exports.moduleDesc = 'Provide commands to deploy mowa projects.';

exports.commandsDesc = {
    'addNode': 'Add a remote node.',
    'addComponent': 'Add a component instance.',
    'run': 'Run deployment jobs'
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'addNode':
            cmdOptions['name'] = {
                desc: 'Name of the remote node',
                promptMessage: 'Please enter the name of remote node',
                required: true,
                alias: ['n'],
                inquire: true
            };
            cmdOptions['host'] = {
                desc: 'Hostname or ip address of the node',
                promptMessage: 'Hostname or ip',
                alias: ['h'],
                inquire: true
            };
            cmdOptions['username'] = {
                desc: 'Username',
                alias: ['u'],
                inquire: true,
                promptDefault: 'root'
            };
            cmdOptions['use-password'] = {
                desc: 'Use password (or "No" to use private key)',
                alias: ['with-password'],
                inquire: true,
                bool: true
            };
            cmdOptions['password'] = {
                desc: 'Password',
                alias: ['p'],
                inquire: () => Promise.resolve(api.getOption('use-password'))
            };
            cmdOptions['key'] = {
                desc: 'Private Key',
                alias: ['k'],
                inquire: () => Promise.resolve(!api.getOption('use-password'))
            };
            cmdOptions['passphrase'] = {
                desc: 'Private Key Passphrase',
                inquire: () => Promise.resolve(!api.getOption('use-password'))
            };
            break;

        case 'addComponent':
            cmdOptions['type'] = {
                desc: 'Type of the component',
                required: true,
                alias: ['t'],
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(DeployManager.getAvailableComponents())
            };
            cmdOptions['name'] = {
                desc: 'Name of the component instance',
                required: true,
                alias: ['n'],
                inquire: true,
                promptDefault: () => Promise.resolve(DeployManager.getComponent(api.getOption('type')).defaultInstanceName)
            };
            break;

        case 'run':
            cmdOptions['reinstall'] = {
                desc: 'Reinstall existing components',
                required: true,
                alias: ['r'],
                inquire: true,
                bool: true,
                promptDefault: false
            };
            break;

        case 'help':
        default:
            //module general options
            break;
    }

    return cmdOptions;
};

exports.addNode = function (api) {
    api.log('verbose', 'exec => mowa deploy addNode');

    let name = api.getOption('name');
    let host = api.getOption('host');
    let username = api.getOption('username');
    let usePassword = api.getOption('use-password');
    let password = api.getOption('password');
    let privateKey = api.getOption('key');
    let passphrase = api.getOption('passphrase');

    let node = {
        host: host,
        username: username
    };

    if (usePassword) {
        node['password'] = password;
    } else {
        node['privateKey'] = privateKey;
        node['passphrase'] = passphrase;
    }

    let nodeSetting = Util.getValueByPath(api.server.configLoader, 'settings.cli.deploy.nodes.' + name);
    if (!_.isEmpty(nodeSetting)) {
        return Promise.reject(`Node "${name}" already exists!`);
    }

    return MowaHelper.writeConfigBlock_(api.server.configLoader, 'settings.cli.deploy.nodes.' + name, node).then(() => {
        api.log('info', `Added remote node "${name}".`);
    });
};

exports.addComponent = function (api) {
    api.log('verbose', 'exec => mowa deploy addComponent');

    let type = api.getOption('type');
    let name = api.getOption('name');

    let configKey = `settings.cli.deploy.components.${type}.${name}`;

    let componentSetting = Util.getValueByPath(api.server.configLoader, configKey);
    if (!_.isEmpty(componentSetting)) {
        return Promise.reject(`Component instance "${type}.${name}" already exists!`);
    }

    return MowaHelper.writeConfigBlock_(api.server.configLoader, configKey, DeployManager.getComponent(type).defaultConfig).then(() => {
        api.log('info', `Added component instance "${type}.${name}".`);
    });
};

exports.run = function (api) {
    api.log('verbose', 'exec => mowa deploy run');

    let reinstall = api.getOption('reinstall');

    let manager = new DeployManager(api, reinstall);
    return manager.run_();
};
