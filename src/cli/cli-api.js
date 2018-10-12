"use strict";

const Util = require('rk-utils');
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;

const path = require('path');
const minimist = require('minimist');
const winston = require('winston');
const inquirer = require('inquirer');

const checkUpdate_ = require('./update.js');
const MowaHelper = require('./mowa-helper.js');

function translateMinimistOptions(opts) {
    let m = {};

    _.forOwn(opts, (detail, name) => {
        if (detail.bool) {
            Util.putIntoBucket(m, 'boolean', name);
        } else {
            Util.putIntoBucket(m, 'string', name);
        }

        if ('default' in detail) {
            Util.setValueByPath(m, `default.${name}`, detail.default);
        }

        if (detail.alias) {
            Util.setValueByPath(m, `alias.${name}`, detail.alias);
        }
    });

    return m;
}

function optionDecorator(name) {
    return name.length == 1 ? ('-' + name) : ('--' + name);
}

class MowaAPI {
    static showBanner() {
        console.log(`Mowa Development & Deployment CLI Helper v${checkUpdate_.version}\n`);
    }

    /**
     * The Mowa CLI api class.
     * @constructs MowaAPI
     * @param {object} modules - CLI modules
     */
    constructor(modules) {
        this.modules = modules;

        //working folder
        this.base = process.cwd();

        //argument options
        this.usageOptions = {
            'e': {
                desc: 'Target build & deploy environment',
                alias: [ 'env', 'environment' ],
                default: 'development'
            },
            'skip-update-check': {
                desc: 'Skip mowa version check',
                alias: [ 'no-update' ],
                bool: true,
                default: false
            },
            'v': {
                desc: 'Show version number',
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
            if (argTrial.v) {
                console.log('v' + checkUpdate_.version);
                process.exit(0);
            }

            MowaAPI.showBanner();

            this._showUsage();
            process.exit(0);
        }

        MowaAPI.showBanner();

        //extract module and command
        let cliModuleName, command;

        if (argNum == 1) {
            cliModuleName = 'default';
            command = argTrial._[0];
        } else {
            cliModuleName = argTrial._[0];
            command = argTrial._[1];
        }

        this.cliModuleName = Util._.camelCase(cliModuleName);
        this.command = Util._.camelCase(command);
        this.cliModule = modules[this.cliModuleName];

        //cli module not found
        if (!this.cliModule) {
            console.error('error: CLI module "' + this.cliModuleName + '" not found!\n');

            this._showUsage();
            process.exit(1);
        }

        Object.assign(this.usageOptions, this.cliModule.help(this));

        //re-parse arguments according to settings
        this.argv = minimist(argv, translateMinimistOptions(this.usageOptions));

        //retrieve general options
        this.env = this.getOption('e');
        this.skipUpdateCheck = this.getOption('skip-update-check') || false;

        this.mowaName = 'mowa-cli';

        //help
        if (this.command === 'help' || this.getOption('?')) {
            this._showUsage();
            process.exit(0);
        }
        
        //default config
        this.config = {
            consoleEnabled: true,
            consoleLogLevel: 'info',
            consoleLogColorize: true,
            fileLogEnabled: true,
            fileLogLevel: 'info',
            fileLogFilename: 'mowa-cli.log',
            fileLogOverwrite: true,
            verbose: false
        };
    }

    /**
     * Initiate Mowa CLI api
     * @memberof MowaAPI
     * @returns {Promise}
     */
    init_() {
        //install uncaughtException handler
        let handleErrors = e => {
            this.log('error', 'UncaughtException ' + e.stack);
            process.exit(1);
        };

        process.on('uncaughtException', handleErrors);

        //check whether config exists
        return MowaHelper.startMowa_(this).then(server => {
            this.server = server;                        
            
            //init logger
            let transports = [];

            if (this.config.general.consoleEnabled) {
                transports.push(new (winston.transports.Console)({
                    level: this.config.general.consoleLogLevel,
                    format: winston.format.combine(winston.format.colorize(), winston.format.simple())
                }));
            }

            if (this.config.general.fileLogEnabled) {
                let fileLogOptions = {};

                if (this.config.general.fileLogOverwrite) {
                    fileLogOptions['flags'] = 'w';
                }

                transports.push(new (winston.transports.File)({
                    level: this.config.general.fileLogLevel,
                    filename: this.config.general.fileLogFilename,
                    options: fileLogOptions
                }));
            }

            this.logger = winston.createLogger({
                transports: transports
            });

            //locate command
            this.commandHanlder_ = this.cliModule[this.command];
            if (typeof this.commandHanlder_ !== 'function') {                
                this.log('error', 'Command "' + this.command + '" not found!\n');
                this.command = undefined;

                this._showUsage();
                process.exit(1);
            }

            this.logger.info(`mowa ${this.cliModuleName} ${this.command}: ` + this.cliModule.commandsDesc[this.command]);
            console.log();

            return this._inquire_().then(() => {
                if (!this._validateArgv()) {
                    this._showUsage();
                    return Promise.reject();
                }

                console.log();
            });
        });
    }

    /**
     * Write message to log
     * @memberof MowaAPI
     * @param level
     * @param message
     * @param data
     */
    log(level, message, data) {
        if (this.logger) {
            if (data) {
                this.logger.log(level, message, data);
            } else {
                this.logger.log(level, message);
            }
        } else {
            console.log(`${level}: ${message}`);
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
     * Set a command line option manually, often  
     * @memberof MowaAPI
     * @param name
     * @param value
     */
    setOption(name, value) {
        this.argv[name] = value;
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

    /**
     * Get the template path
     * @memberof MowaAPI
     * @param {string} templateName - Template name
     * @returns {string}
     */
    getTemplatePath(templateName) {
        post: {
            fs.existsSync(it), 'Template folder not exists.';
        }
        return path.resolve(__dirname, '..', '..', 'templates', templateName);
    }

    /**
     * Push app choice in options 
     * @param {*} cmdOptions 
     */
    makeAppChoice(cmdOptions) {
        cmdOptions['app'] = {
            desc: 'The name of the app to operate',
            promptMessage: 'Please select the target app:',                
            required: true,
            inquire: true,
            promptType: 'list',
            choicesProvider: () => MowaHelper.getAvailableAppNames(this)
        };
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

    async _inquire_() {
        let doInquire = item => inquirer.prompt([item]).then(answers => {
            _.forOwn(answers, (ans, name) => {
                this.argv[name] = ans;
                let opts = this.usageOptions[name];
                if (opts.alias) {
                    _.each(opts.alias, a => { this.argv[a] = ans; });
                }
            })
        }); 
        
        return Util.eachAsync_(this.usageOptions, async (opts, name) => {
            if (('inquire' in opts) && !this.argv[name]) {
                let inquire = opts.inquire;
                
                if (typeof opts.inquire === 'function') {
                    inquire = await opts.inquire();
                }

                if (inquire) {
                    let type;
                    let q = { name: name, message: opts.promptMessage || opts.desc };

                    if (opts.promptType) {
                        type = opts.promptType;
                        if (type === 'list' || type  === 'rawList' || type === 'checkbox' || type === 'expand') {
                            if (!opts.choicesProvider) {
                                throw new Error('Missing choices provider!');
                            }

                            q.choices = await opts.choicesProvider();
                        }
                    } else if (opts.bool) {
                        type = 'confirm';
                    } else {
                        type = 'input'
                    }

                    q.type = type;

                    if ('promptDefault' in opts) {
                        if (typeof opts.promptDefault === 'function') {
                            q.default = await opts.promptDefault();
                        } else {
                            q.default = opts.promptDefault;
                        }
                    }

                    await doInquire(q);
                }
            } else if (name in this.argv && 'nonInquireFilter' in opts) {
                this.argv[name] = await opts.nonInquireFilter(this.argv[name]);
            } 
        });
    }

    _showUsage() {
        let cliModule = this.cliModuleName || '[cli module]';
        let command = (this.command && this.command !== 'help') ? this.command : '<command>';

        let usage = `Usage: ${path.basename(process.argv[1])} ${cliModule} ${command} [options]\n`;

        if (cliModule === '[cli module]') {
            usage += '\nAvailable cli modules: '
                + _.reduce(this.modules, (sum, value, key) => (sum + '\n  ' + key + ': ' + value.moduleDesc), '')
                + '\n\n';
        } else if (command === '<command>' && this.cliModule) {
            usage += '\nModule "' + cliModule + '": ' + this.cliModule.moduleDesc + '\n\n';
            usage += 'Available commands for "' + this.cliModuleName + '" module: '
                + _.reduce(_.omit(this.cliModule, ['moduleDesc', 'commandsDesc', 'help']), (sum, value, key) => (sum + '\n  ' + key + ': ' + this.cliModule.commandsDesc[key]), '')
                + '\n\n';
        } else if (this.cliModule) {
            usage += '\nCommand "' + cliModule + '.' + this.command + '": ' + this.cliModule.commandsDesc[this.command] + '\n\n';
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