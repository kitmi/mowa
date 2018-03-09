"use strict";

const path = require('path');
const shell = require('shelljs');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;

const Mowa = require('../../../server.js');
const MowaHelper = require('../../mowa-helper.js');

const passportStrategies = require('./strategies.js');

/**
 * @module MowaCLI_App
 * @summary Application module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to enable react in an app.';

exports.commandsDesc = {
    'enable': "Enable the passport feature.",
    'install': "Install passport strategy."
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'enable':
            cmdOptions['app'] = {
                desc: 'The name of the target app',
                required: true,
                inquire: true,
                promptType: 'list',
                promptMessage: 'Please select the target app:',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['no-local'] = {
                desc: 'Disable local strategy',
                promptMessage: 'Disable the local strategy?',
                promptDefault: false,
                required: true,
                inquire: true,
                bool: true
            };
            break;

        case 'install':
            cmdOptions['app'] = {
                desc: 'The name of the target app',
                required: true,
                inquire: true,
                promptType: 'list',
                promptMessage: 'Please select the target app:',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['strategies'] = {
                desc: 'The passport strategies to install',
                promptMessage: 'Select the strategies to install?',
                alias: [ 'sg' ], //strategy groups
                required: true,
                inquire: true,
                promptType: 'checkbox',
                choicesProvider: () => require('./strategies.js'),
                nonInquireFilter: value => value.split(',')
            };
            break;

        case 'help':
        default:
            //module general options
            break;
    }

    return cmdOptions;
};

exports.enable = async api => {
    api.log('verbose', 'exec => mowa passport enable');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let strategiesPath = path.join(appModule.backendPath, 'passports');
    fs.ensureDirSync(strategiesPath);

    let pkgToInstall = 'koa-passport';
    
    let noLocal = api.getOption('no-local');
    if (!noLocal) {
        pkgToInstall += ' passport-local';

        let localTemplate = path.join(__dirname, 'template', 'local.js');
        let targetPath = path.join(strategiesPath, 'local.js');

        if (!fs.existsSync(targetPath)) {
            fs.copySync(localTemplate, targetPath);
            api.log('info', 'Created local passport strategy.');
        }
    }

    shell.cd(appModule.absolutePath);
    let stdout = Util.runCmdSync('npm i --save ' + pkgToInstall);
    api.log('verbose', stdout);
    shell.cd(api.base);

    api.log('info', 'Enabled passport feature.');
};

exports.install = async api => {
    api.log('verbose', 'exec => mowa passport install');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let strategies = api.getOption('strategies');

    let strategyGroups = [];

    strategies.forEach(sg => {
        if (!(sg in passportStrategies)) {
            throw new Error('Unknown passport strategy group: ' + sg);
        }
        strategyGroups = strategyGroups.concat(passportStrategies[sg]);
    });

    let pkgsLine = strategyGroups.join(' ');

    shell.cd(appModule.absolutePath);
    let stdout = Util.runCmdSync(`npm i --save ${pkgsLine}`);
    api.log('verbose', stdout);
    shell.cd(api.base);

    api.log('info', `Installed passport strategies: ${pkgsLine}.`);
};