"use strict";

const Util = require('rk-utils');
const _ = Util._;

const path = require('path');
const minimist = require('minimist');
const winston = require('winston');
const inflection = require('inflection');
const checkUpdate = require('./update.js');
const Mowa = require('../server.js');
const Literal = Mowa.Util.Literal;
const { Config, JsonConfigProvider } = require('rk-config');
const inquirer = require('inquirer');

function translateMinimistOptions(opts) {
    let m = {};

    _.forOwn(opts, (detail, name) => {
        if (detail.bool) {
            Mowa.Util.putIntoBucket(m, 'boolean', name);
        } else {
            Mowa.Util.putIntoBucket(m, 'string', name);
        }

        if ('default' in detail) {
            Mowa.Util.setValueByPath(m, `default.${name}`, detail.default);
        }

        if (detail.alias) {
            Mowa.Util.setValueByPath(m, `alias.${name}`, detail.alias);
        }
    });

    return m;
}

function optionDecorator(name) {
    return name.length == 1 ? ('-' + name) : ('--' + name);
}

class MowaAPI {
    /**
     * The Mowa CLI api class.
     * @constructs MowaAPI
     * @param {object} modules - CLI modules
     */
    constructor(modules) {
        this.modules = modules;

        //working folder
        this.base = process.cwd();

        console.log(`Mowa Development & Deployment CLI Helper v${checkUpdate.version}\n`);

        //argument options
        this.usageOptions = {
            'e': {
                desc: 'Target build & deploy environment',
                alias: [ 'env', 'environment' ],
                default: 'development'
            },
            'skip-update-check': {
                desc: 'Skip mowa version check',
                bool: true,
                default: false
            },
            '?': {
                desc: 'Show usage message',
                alias: [ 'help' ],
                bool: true,
                default: false
            }
        };

        //try parse module and command first
        let argv = process.argv.slice(2);
        let argTrial = minimist(argv, translateMinimistOptions(this.usageOptions));
        let argNum = argTrial._.length;

        //no command and no module specified
        if (argNum == 0) {
            console.error('Command not given!\n');

            this._showUsage();
            process.exit(1);
        }

        //extract module and command
        let cliModuleName, command;

        if (argNum == 1) {
            cliModuleName = 'default';
            command = argTrial._[0];
        } else {
            cliModuleName = argTrial._[0];
            command = argTrial._[1];
        }

        this.cliModuleName = inflection.camelize(cliModuleName, true);
        this.command = inflection.camelize(command, true);
        this.cliModule = modules[this.cliModuleName];

        //cli module not found
        if (!this.cliModule) {
            console.error('CLI module "' + this.cliModuleName + '" not found!\n');

            this._showUsage();
            process.exit(1);
        }

        Object.assign(this.usageOptions, this.cliModule.help(this));

        //re-parse arguments according to settings
        this.argv = minimist(argv, translateMinimistOptions(this.usageOptions));

        //retrieve general options
        this.env = this.getOption('e');
        this.skipUpdateCheck = this.getOption('skip-update-check') || false;

        this.mowaName = 'cli';

        //help
        if (this.command === 'help' || this.getOption('?')) {
            this._showUsage();
            process.exit(0);
        }
    }

    /**
     * Initiate Mowa CLI api
     * @memberof MowaAPI
     * @returns {Promise}
     */
    init() {
        //load deploy config if exist
        let configLoader = new Config(new JsonConfigProvider(path.join(this.base, Literal.ETC_PATH), 'deploy', this.env));
        return configLoader.load().then(cfg => {
            if (Mowa.Util._.isEmpty(cfg)) {
                if ((this.cliModuleName !== 'default' || this.command !== 'init') && this.command !== 'help') {
                    return Promise.reject("Deployment config file not found. Run 'mowa init' first.")
                }
            }

            this.config = cfg;

            //init logger for cli
            winston.cli();

            let defaultConfig = Object.assign({
                consoleLogLevel: 'info',
                consoleLogColorize: true,
                fileLogLevel: 'verbose',
                fileLogFilename: 'mowa-deploy.log',
                fileLogOptions: { flag: 'w' },
                mowaVerbose: false
            }, this.getConfig('default'));

            this.config['default'] = defaultConfig;

            this.logger = new (winston.Logger)({
                transports: [
                    new (winston.transports.Console)({ level: defaultConfig.consoleLogLevel, colorize: defaultConfig.consoleLogColorize }),
                    new (winston.transports.File)({ level: defaultConfig.fileLogLevel, filename: defaultConfig.fileLogFilename, options: defaultConfig.fileLogOptions, json: false })
                ]
            });

            this.sessions = null;

            this.commandHanlder = this.cliModule[this.command];
            if (typeof this.commandHanlder !== 'function') {
                this.log('error', 'Command "' + this.command + '" not found!\n');
                this.command = undefined;

                this._showUsage();
                process.exit(1);
            }

            //install uncaughtException handler
            let handleErrors = e => {
                this.log('error', 'UncaughtException ' + e.stack);
                process.exit(1);
            };

            process.on('uncaughtException', handleErrors);

            return this._inquire_().then(() => {
                if (!this._validateArgv()) {
                    this._showUsage();
                    return Promise.reject();
                }
            });
        });
    }

    /**
     * Check whether it's the latest version
     * @memberof MowaAPI
     * @returns {Promise}
     */
    checkUpdate() {
        return checkUpdate(this);
    }

    /**
     * Write message to log
     * @memberof MowaAPI
     * @param level
     * @param message
     * @param data
     */
    log(level, message, data) {
        if (data) {
            this.logger.log(level, message, data);
        } else {
            this.logger.log(level, message);
        }
    }    

    /**
     * Get a command line option
     * @memberof MowaAPI
     * @param name
     * @returns {*}
     */
    getOption(name) {
        return this.argv[name];
    }

    /**
     * Get a config item
     * @memberof MowaAPI
     * @param moduleName
     * @returns {*}
     */
    getConfig(moduleName) {
        return this.config[moduleName];
    }

    getSessions(modules = []) {
        const sessions = this._pickSessions(modules);
        return Object.keys(sessions).map(name => sessions[name]);
    }

    withSessions(modules = []) {
        const api = Object.create(this);
        api.sessions = this._pickSessions(modules);
        return api;
    }

    _pickSessions(modules = []) {
        if (!this.sessions) {
            this._loadSessions();
        }

        const sessions = {};

        modules.forEach(moduleName => {
            const moduleConfig = this.config[moduleName];
            if (!moduleConfig) {
                return;
            }

            for (var name in moduleConfig.servers) {
                if (!moduleConfig.servers.hasOwnProperty(name)) {
                    continue;
                }

                if (this.sessions[name]) {
                    sessions[name] = this.sessions[name];
                }
            }
        });

        return sessions;
    }

    _validateArgv() {
        let valid = true;

        _.forOwn(this.usageOptions, (opts, name) => {

            if (opts.required && !(name in this.argv)) {
                console.error(`Argument "${name}" is required.`);
                valid = false;
            }
        });

        return valid;
    }

    _inquire_() {
        let inquireWorkers = [], type;

        _.forOwn(this.usageOptions, (opts, name) => {

            if (opts.inquire && !(name in this.argv)) {

                if (opts.promptType) {
                    type = opts.promptType;
                    if (type === 'list' || type  === 'rawList' || type === 'checkbox' || type === 'expand') {
                        if (!opts.choicesProvider) {
                            throw new Error('Missing choices provider!');
                        }

                        inquireWorkers.push(() => opts.choicesProvider().then(data => inquirer.prompt([
                            { type: type, name: name, message: opts.desc, choices: data }
                        ])).then(answers => {
                            let answer = answers[name].trim();

                            this.argv[name] = answer;
                            if (opts.alias) {
                                _.each(opts.alias, a => { this.argv[a] = answer });
                            }
                        }));

                        return;
                    }
                } else if (opts.bool) {
                    type = 'confirm';
                } else {
                    type = 'input'
                }

                inquireWorkers.push(() => inquirer.prompt([
                    { type: type, name: name, message: opts.desc }
                ]).then(answers => {
                    let answer = answers[name].trim();

                    this.argv[name] = answer;
                    if (opts.alias) {
                        _.each(opts.alias, a => { this.argv[a] = answer });
                    }
                }));
            }
        });

        if (_.isEmpty(inquireWorkers)) {
            return Promise.resolve();
        }

        return Util.eachPromise(inquireWorkers);
    }

    _showUsage() {
        let cliModule = this.cliModuleName || '[cli module]';
        let command = (this.command && this.command !== 'help') ? this.command : '<command>';

        let usage = `Usage: ${path.basename(process.argv[1])} ${cliModule} ${command} [options]\n\n`;

        if (cliModule === '[cli module]') {
            usage += 'Available cli modules: '
                + _.reduce(this.modules, (sum, value, key) => (sum + '\n  ' + key + ': ' + value.moduleDesc), '')
                + '\n\n';
        } else if (command === '<command>') {
            usage += '"' + cliModule + '" module: ' + this.cliModule.moduleDesc + '\n\n';
            usage += 'Available commands for "' + this.cliModuleName + '" module: '
                + _.reduce(_.omit(this.cliModule, ['moduleDesc', 'commandsDesc', 'help']), (sum, value, key) => (sum + '\n  ' + key + ': ' + this.cliModule.commandsDesc[key]), '')
                + '\n\n';
        }

        usage += `Options:\n`;
        _.forOwn(this.usageOptions, (opts, name) => {

            let line = '  ' + optionDecorator(name);
            if (opts.alias) {
                line += _.reduce(opts.alias, (sum, a) => (sum + ', ' + optionDecorator(a)), '');
            }

            line += '\n';

            line += '    ' + opts.desc + '\n';

            if (opts.default) {
                line += '    default: ' + opts.default.toString() + '\n';
            }

            if (opts.required) {
                line += '    required\n';
            }

            line += '\n';

            usage += line;
        });

        console.log(usage);
    }
}

module.exports = MowaAPI;