const path = require('path');
const webpack = require( 'webpack');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;
const shell = require('shelljs');

const MowaHelper = require('../../mowa-helper.js');

const webpackComponents = require('./components.js');

/**
 * @module MowaCLI_Webpack
 * @summary Webpack module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to run webpack tasks.';

exports.commandsDesc = {
    'init': 'Initialize webpack environment.',
    'config': 'Regenerate webpack config',
    'install': "Install webpack components",
    'babel': 'Install babel plugins',
    'build': 'Build client bundles with webpack.'
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'init':
        case 'config':
        case 'build':        
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            break;

        case 'babel':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['plugins'] = {
                desc: 'The babel plugins to install',
                required: true,
                inquire: true,
                promptType: 'checkbox',
                choicesProvider: () => Promise.resolve(require('./babelPlugins.js'))
            };
            break;

        case 'install':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['package'] = {
                desc: 'The name of the webpack component package to install',
                alias: [ 'pkg' ],
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(webpackComponents.componentGroup)
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
    api.log('verbose', 'exec => mowa webpack init');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    await exports.config(api);

    shell.cd(appModule.absolutePath);
    let stdout = Util.runCmdSync('npm i --save-dev babel-loader babel-core babel-preset-env babel-preset-react ' +
        'webpack webpack-merge  webpack-dev-server ' +
        'extract-text-webpack-plugin css-loader style-loader file-loader expose-loader sass-loader node-sass');
    shell.cd(api.base);

    api.log('verbose', stdout);
    api.log('info', 'Enabled webpack.');
};

exports.config = async api => {
    api.log('verbose', 'exec => mowa webpack config');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    //write default webpack
    const swig  = require('swig-templates');
    let defaultTemplate = path.resolve(__dirname, 'template', 'etc', 'webpack.default.js.swig');
    let webpackOptions = Util.getValueByPath(appModule.settings, 'deploy.webpack', {});

    let appEtcPath = appModule.toAbsolutePath(appModule.options.etcPath);
    let templateValues = {
        profileName: 'browser',
        clientPath: path.relative(appEtcPath, appModule.frontendPath),
        outputPath: path.relative(appEtcPath, appModule.frontendStaticPath),
        publicPath: Util.ensureLeftSlash(appModule.route),
        cleanBeforeBuild: webpackOptions.cleanBeforeBuild || false
    };

    let webpackDefault = swig.renderFile(defaultTemplate, templateValues);

    fs.writeFileSync(path.join(appModule.absolutePath, 'etc', 'webpack.default.js'), webpackDefault);
    api.log('info', 'Generated webpack.default.js.');

    let devTemplate = path.resolve(__dirname, 'template', 'etc', 'webpack.development.js.swig');
    let webpackDev= swig.renderFile(devTemplate, templateValues);

    fs.writeFileSync(path.join(appModule.absolutePath, 'etc', 'webpack.development.js'), webpackDev);
    api.log('info', 'Generated webpack.development.js.');

    let prodTemplate = path.resolve(__dirname, 'template', 'etc', 'webpack.production.js.swig');
    let webpackProd= swig.renderFile(prodTemplate, templateValues);

    fs.writeFileSync(path.join(appModule.absolutePath, 'etc', 'webpack.production.js'), webpackProd);
    api.log('info', 'Generated webpack.production.js.');
};

exports.install = function (api) {
    api.log('verbose', 'exec => mowa webpack install');

    let pkgName = api.getOption('pkg');
    assert: {
        pkgName, Util.Message.DBC_VAR_NOT_NULL;
    }

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let pkgs = webpackComponents.componentPackages[pkgName];
    let pkgsLine = pkgs.join(' ');

    let appPath = appModule.absolutePath;

    shell.cd(appPath);
    let stdout = Util.runCmdSync(`npm i --save-dev ${pkgsLine}`);
    shell.cd(api.base);

    api.log('verbose', stdout);
    api.log('info', `Installed webpack component: ${pkgsLine}.`);
};

exports.babel = function (api) {
    api.log('verbose', 'exec => mowa webpack babel');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let plugins = api.getOption('plugins');

    let cmdLine = plugins.map(p => 'babel-plugin-' + p).join(' ');

    shell.cd(appModule.absolutePath);
    let stdout = Util.runCmdSync('npm i --save-dev ' + cmdLine);
    shell.cd(api.base);

    api.log('verbose', stdout);
    api.log('info', 'Babel plugins installed');
    api.log('info', 'Add below plugins into the plugin list of babel-loader in webpack config file to enable these features.');
    api.log('info', "plugins: [ '" + plugins.join("', '") + "' ]");

    if (plugins.indexOf("transform-decorators-legacy") > -1 || plugins.indexOf("transform-class-properties") > -1) {
        api.log('info', 'Notice: "transform-decorators-legacy" should appear before "transform-class-properties"');
    }
};

exports.build = function (api) {
    api.log('verbose', 'exec => mowa webpack build');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    api.log('info', `Start webpacking ...`);

    let env = api.getOption('env');

    let config = require(appModule.toAbsolutePath('etc', 'webpack.' + env + '.js'));

    var compiler = webpack(config);

    return new Promise((resolve, reject) => {
        compiler.run(function (err, stats) {
            if (err) {
                reject(err);
            } else {
                var jsonStats = stats.toJson("minimal");
                if (jsonStats.errors.length > 0) {
                    reject(jsonStats.errors.join('\n'));
                } else {
                    api.log('verbose', stats.toString({chunks: false, colors: true}));
                    api.log('info', `Client files are packed successfully.`);
                    resolve();
                }
            }
        });
    });
};