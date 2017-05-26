"use strict";

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const winston = require('winston');
const async = require('async');
const inflection = require('inflection');
const checkUpdate = require('./update.js');
const Mowa = require('../server.js');
const Literal = Mowa.Util.Literal;
const CLIUtil = require('./cli-util.js');

function translateMinimistOptions(opts) {
    let m = {};

    _.forOwn(opts, (detail, name) => {
        if (detail.bool) {
            Mowa.Util.pushObjIntoBucket(m, 'boolean', name);
        } else {
            Mowa.Util.pushObjIntoBucket(m, 'string', name);
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
        console.log(`Mowa Development & Deployment CLI Helper v${checkUpdate.version}\n`);

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

            this.showUsage(true);
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

            this.showUsage(true);
            process.exit(1);
        }

        Object.assign(this.usageOptions, this.cliModule.help(this));

        //re-parse arguments according to settings
        this.argv = minimist(argv, translateMinimistOptions(this.usageOptions));

        //help
        if (this.command === 'help' || this.getOption('?')) {
            this.showUsage();
            process.exit(0);
        }

        //retrieve general options
        this.env = this.getOption('e');
        this.skipUpdateCheck = this.getOption('skip-update-check') || false;

        this.mowaName = 'cli';
    }

    /**
     * Initiate Mowa CLI api
     * @memberof MowaAPI
     * @returns {Promise}
     */
    init() {
        //load deploy config if exist
        return Mowa.Util.loadEIConfig(path.join(this.base, Literal.ETC_PATH), 'deploy', this.env).then(cfg => {


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

            this.defaultConfig = defaultConfig;
            this.sessions = null;

            this.commandHanlder = this.cliModule[this.command];
            if (typeof this.commandHanlder !== 'function') {
                console.error('Command "' + this.command + '" not found!\n');

                this.showUsage();
                process.exit(1);
            }

            //install uncaughtException handler
            let handleErrors = e => {
                this.log('error', 'UncaughtException ' + e.stack);
                process.exit(1);
            };

            process.on('uncaughtException', handleErrors);

            return Promise.resolve();
        });
    }

    /**
     * Show Mowa CLI usage
     * @memberof MowaAPI
     * @param {boolean} showAsGeneral
     */
    showUsage(showAsGeneral) {
        let cliModule = this.cliModuleName || '[cli module]';
        let command = (this.command && this.command !== 'help') ? this.command : '<command>';

        let usage = `Usage: ${path.basename(process.argv[1])} ${cliModule} ${command} [options]\n\n`;

        if (showAsGeneral) {
            usage += 'Available cli modules: '
                + _.reduce(this.modules, (sum, value, key) => (sum + '\n  ' + key + ': ' + value.desc.desc), '')
                + '\n\n';
        } else if (this.command === 'help') {
            usage += 'Available commands for "' + this.cliModuleName + '" module: '
                + _.reduce(_.omit(this.cliModule, ['desc', 'help']), (sum, value, key) => (sum + '\n  ' + key + ': ' + this.cliModule.desc[key]), '')
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

            usage += line;
        });

        console.log(usage);
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
     * Get a list of app names
     * @memberof MowaAPI
     * @returns {Array}
     */
    getAppNames() {
        let webModulesPath = path.resolve(this.base, Literal.APP_MODULES_PATH);

        let modules = fs.readdirSync(webModulesPath, 'utf8');

        return _.filter(modules, f => fs.lstatSync(path.join(webModulesPath, f)).isDirectory());
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

    _loadSessions() {
        const config = this.getConfig();
        this.sessions = {};

        // `mup.servers` contains login information for servers
        // Use this information to create nodemiral sessions.
        for (var name in config.servers) {
            if (!config.servers.hasOwnProperty(name)) {
                continue;
            }

            const info = config.servers[name];
            const auth = {username: info.username};
            const opts = {ssh: {}};

            var sshAgent = process.env.SSH_AUTH_SOCK;

            if (info.opts) {
                opts.ssh = info.opts;
            }

            if (info.pem) {
                auth.pem = fs.readFileSync(path.resolve(info.pem), 'utf8');
            } else if (info.password) {
                auth.password = info.password;
            } else if (sshAgent && fs.existsSync(sshAgent)) {
                opts.ssh.agent = sshAgent;
            } else {
                console.error(
                    'error: server %s doesn\'t have password, ssh-agent or pem',
                    name
                );
                process.exit(1);
            }

            const session = nodemiral.session(info.host, auth, opts);
            this.sessions[name] = session;
        }
    }
}

module.exports = MowaAPI;