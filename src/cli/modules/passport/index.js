"use strict";

const path = require('path');
const shell = require('shelljs');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;

const Mowa = require('../../../server.js');
const MowaHelper = require('../../mowa-helper.js');

const PASSPORT_STRATEGIES = require('./strategies.js');
const CONFIG_PATH = 'passport.strategies';    

/**
 * @module MowaCLI_App
 * @summary Application module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to enable react in an app.';

exports.commandsDesc = {    
    'install': "Install passport strategy.",
    'enable': "Enable a passport strategy.",
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
            cmdOptions['strategies'] = {
                desc: 'The passport strategies to enable',
                promptMessage: 'Select the strategies to enable?',
                alias: [ 'sg' ], //strategy groups
                required: true,
                inquire: true,
                promptType: 'checkbox',
                choicesProvider: () => {
                    let appModule = MowaHelper.getAppModuleToOperate(api);
                    let ps = MowaHelper.getAvailablePassportStrategies(appModule);
                    let enabled = new Set(Util.getValueByPath(appModule.config, CONFIG_PATH, []));                                       
                    
                    return ps.map(s => ({ name: s, checked: enabled.has(s) }));
                },
                nonInquireFilter: value => value.split(',')
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
                choicesProvider: () => Object.keys(require('./strategies.js')),
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
    let strategies = api.getOption('strategies');
    
    await MowaHelper.writeConfigBlock_(appModule.configLoader, CONFIG_PATH, strategies);

    api.log('info', 'Enabled passport strategies: ' + strategies.join(', '));
};

exports.install = async api => {
    api.log('verbose', 'exec => mowa passport install');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let strategiesPath = path.join(appModule.backendPath, 'passports');
    fs.ensureDirSync(strategiesPath);

    let strategies = api.getOption('strategies');

    let strategyGroups = [];

    let passportStrategies = Util.getValueByPath(appModule.config, CONFIG_PATH, []);
    let psSet = new Set(passportStrategies);

    strategies.forEach(sg => {
        if (!(sg in PASSPORT_STRATEGIES)) {
            throw new Error('Unknown passport strategy group: ' + sg);
        }

        //add into passport feature    
        psSet.add(sg);

        strategyGroups = strategyGroups.concat(PASSPORT_STRATEGIES[sg]);

        let strategyBootstrapFile = sg + '.js';

        let templatePath = api.getTemplatePath('passport');
        let localTemplate = path.join(templatePath, strategyBootstrapFile);
        let targetPath = path.join(strategiesPath, strategyBootstrapFile);

        if (!fs.existsSync(targetPath)) {
            fs.copySync(localTemplate, targetPath);
            api.log('info', `Created "${sg}" passport strategy bootstrap file.`);
        }
    });

    let pkgsLine = 'koa-passport ' + strategyGroups.join(' ');

    shell.cd(appModule.absolutePath);
    let stdout = Util.runCmdSync(`npm i --save ${pkgsLine}`);
    api.log('verbose', stdout);
    shell.cd(api.base);   

    await MowaHelper.writeConfigBlock_(appModule.configLoader, CONFIG_PATH, Array.from(psSet));

    api.log('info', `Installed passport strategies: ${pkgsLine}.`);
};