"use strict";

const path = require('path');
const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;

const MowaHelper = require('../../mowa-helper.js');

/**
 * @module MowaCLI_Default
 * @summary Default module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to initiate a new project or create a new app.';

exports.commandsDesc = {
    'init': 'Run this command in a empty folder to initiate a new mowa project.',
    'install': 'Run this command install all the packages required by a app or all apps by default.'
};

exports.help = function (api) {
    let cmdOptions = {};
    
    switch (api.command) {        
        case 'init':
            cmdOptions['skip-npm-install'] = {
                desc: 'Skip running npm install after initialization',
                bool: true,
                alias: [ 'skip' ],
                default: false,
                inquire: true
            };
            break;

        case 'install':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate'
            };
            break;

        case 'help':
        default:
            //module general options
            break;
    }
    
    return cmdOptions;
};

exports.init = async api => {
    api.log('verbose', 'exec => mowa init');

    let skipNpmInstall = api.getOption('skip-npm-install') || false;
    const etcDest = path.join(api.base, 'etc');

    //check whether etc folder exist
    if (fs.existsSync(etcDest)) {
        return Promise.reject('Project already exist.');
    }

    //create etc folder
    fs.ensureDirSync(etcDest);

    //copy etc folder from template
    const templateFolder = path.resolve(__dirname, 'template');
    const etcSource = path.join(templateFolder, 'etc');
    fs.copySync(etcSource, etcDest);
    api.log('info', `Generated server configuration.`);

    //copy server folder from template
    const serverDest = path.resolve(api.base, 'server');
    const serverSource = path.join(templateFolder, 'server');
    fs.copySync(serverSource, serverDest);
    api.log('info', `Generated the default application.`);
    
    //generate a package.json if not exist
    const packageJson = path.resolve(api.base, 'package.json');
    if (!fs.existsSync(packageJson)) {
        let output = await Util.runCmd_('npm init -y');

        if (output.stdout) {
            api.log('verbose', output.stdout);
        }

        if (output.stderr) {
            api.log('error', output.stderr);
        }

        api.log('info', 'Created a package.json file under ' + api.base);
    }

    //generate server entry file
    const serverJsTemplate = path.join(templateFolder, 'server.template.js');
    const serverJsDst = path.join(api.base, 'server.js');
    const pkg = require(packageJson);
    let serverJsTemplateContent = fs.readFileSync(serverJsTemplate, 'utf8');
    let serverJsContent = Util.S(serverJsTemplateContent).template({serverName: pkg.name}).s;
    fs.writeFileSync(serverJsDst, serverJsContent, 'utf8');

    pkg.dependencies || (pkg.dependencies = {});
    pkg.dependencies['mowa'] = '*';
    fs.writeJsonSync(packageJson, pkg, { spaces: 4, encoding: 'utf8' });

    if (skipNpmInstall) {
        return;
    }

    let output = await Util.runCmd_('npm install --no-save --no-package-lock');
    if (output.stdout) {
        api.log('verbose', output.stdout);
    }

    if (output.stderr) {
        api.log('error', output.stderr);
    }

    api.log('info', 'Installed mowa as dependency.');
};

exports.install = async api => {
    api.log('verbose', 'exec => mowa install');

    let appName = api.getOption('app');
    let appNames = api.getOption('app') ? [ appName ] : MowaHelper.getAvailableAppNames(api);

    let depSet = {};

    const compareVersions = require('compare-versions');

    let mergeDeps = (deps) => {
        _.forOwn(deps, (v, k) => {
            if (k in depSet) {
                let ov = depSet[k];

                if (ov !== v) {
                    if (ov.indexOf('/') > -1 || v.indexOf('/') > -1) {
                        throw new Error(`Package "${k}" version conflict: ${v} & ${ov}!`);
                    }

                    let existingV = ov[0] === '^' ? ov[0].substr(1) : ov;
                    let newV = v[0] === '^' ? v[0] : v;

                    if (compareVersions(newV, existingV) > 0) {
                        depSet[k] = v;
                    }
                }
            } else {
                depSet[k] = v;
            }
        });
    };

    await Util.eachAsync_(appNames, async appPath => {
        let pkgFile = path.join(api.base, 'app_modules', appPath, 'package.json');
        let pkg = require(pkgFile);

        if (!_.isEmpty(pkg.devDependencies)) {
            mergeDeps(pkg.devDependencies);
        }

        if (!_.isEmpty(pkg.dependencies)) {
            mergeDeps(pkg.dependencies);
        }
    });

    return Util.eachAsync_(depSet, async (v,k) => {
        let pkgDesc = v.indexOf('/') > -1 ? v : k+'@'+v;

        api.log('info', `Installing package "${pkgDesc}".`);

        let output = await Util.runCmd_('npm install --no-save --no-package-lock ' + pkgDesc);
        if (output.stdout) {
            api.log('verbose', output.stdout);
        }

        if (output.stderr) {
            api.log('error', output.stderr);
        }

        api.log('info', `Package "${pkgDesc}" is successfully installed.`);
    });
};