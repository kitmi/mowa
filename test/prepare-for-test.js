'use strict';

/**
 * Module dependencies.
 */

const path = require('path');
const Mowa = require('../lib/server.js');
const Util = Mowa.Util;
const fs = Util.fs;

const { run_, mowa_, replaceMowaDep } = require('./test-utils.js');

const TEST_WORK_FOLDER = path.resolve(__dirname, 'temp', 'fixtures');
const TEST_PROJECTS_FOLDER = path.join(TEST_WORK_FOLDER, 'projects');
const MOWA_PATH = path.resolve(__dirname, '..');

let isTravisEnv = false;
if (process.argv.length > 2) {
    isTravisEnv = process.argv[2] === 'travis';
}

const MYSQL_CONNECTION = isTravisEnv ? 'mysql://travis@127.0.0.1' : 'mysql://root:root@127.0.0.1';

// Copy all fixtures to test working folder
const FIXTURES_PATH = path.resolve(__dirname, 'fixtures');
fs.emptyDirSync(TEST_WORK_FOLDER);
fs.copySync(FIXTURES_PATH, TEST_WORK_FOLDER);

// Update mowa reference path in all package.json
function replaceMowaDepOfAllSubFolders(dir) {
    fs.readdirSync(dir).forEach(folder => {
        let p = path.join(dir, folder);
        if (fs.statSync(p).isDirectory()) {
            let pkgFile = path.join(p, 'package.json');
            if (fs.existsSync(pkgFile)) {
                replaceMowaDep(pkgFile, MOWA_PATH);
            }
    
            let appModules = path.join(p, 'app_modules');
            if (fs.existsSync(appModules) && fs.statSync(appModules).isDirectory()) {
                replaceMowaDepOfAllSubFolders(appModules);
            }
        }
    });
}

replaceMowaDepOfAllSubFolders(TEST_PROJECTS_FOLDER);

(async () => {
    console.log('Preparing test fixtures ...');        

    const CLI_APP_TEST_FOLDER = path.join(TEST_PROJECTS_FOLDER, 'cli-app');
    process.chdir(CLI_APP_TEST_FOLDER);  
    await mowa_('app create --app=test --override');

    const OOLONG_TEST_FOLDER = path.join(TEST_PROJECTS_FOLDER, 'oolong-test');
    process.chdir(OOLONG_TEST_FOLDER);  
    await mowa_('app create --app=mysql --override');
    await mowa_('db enable --app=mysql --dbms=mysql');

    process.chdir(TEST_WORK_FOLDER);  
    await run_('lerna bootstrap');

    process.chdir(OOLONG_TEST_FOLDER);  
    await mowa_(`db add --app=mysql --dbms=mysql --db=mowa-unit-oolong --conn=${MYSQL_CONNECTION}/mowa-unit-oolong`);
    await mowa_('oolong create --app=mysql --schema=oolong-test');
    await mowa_('oolong config --app=mysql --schema=oolong-test --db=mysql:mowa-unit-oolong');

    const TEMPLATE_PATH = path.resolve(__dirname, 'templates');
    const TARGET_BAES_PATH = path.join(OOLONG_TEST_FOLDER, 'app_modules', 'mysql', 'oolong');
    fs.copySync(path.join(TEMPLATE_PATH, 'schemas', 'oolong-test.ool'), path.join(TARGET_BAES_PATH, 'oolong-test.ool'));
    fs.copySync(path.join(TEMPLATE_PATH, 'entities'), path.join(TARGET_BAES_PATH, 'entities'));

    const OO_MYSQL_APP_CFG_FILE = path.join(OOLONG_TEST_FOLDER, 'app_modules', 'mysql', 'etc', 'app.development.json');
    const appCfg = fs.readJsonSync(OO_MYSQL_APP_CFG_FILE);
    appCfg["i18n"] = { "store": "file" };
    appCfg.oolong.logSqlStatement = !isTravisEnv;
    appCfg["middlewares"] = {        
        "bodyParser": {}
    };
    fs.writeJsonSync(OO_MYSQL_APP_CFG_FILE, appCfg, {spaces: 4});

    await run_('npm run build');
    await mowa_('oolong build --app=mysql --rest=false');
    await run_('npm run build');

    await mowa_('oolong deploy --app=mysql --reset');
    await mowa_('oolong importData --app=mysql --conn=mysql:mowa-unit-oolong --dataSet=_init');

    console.log('Test fixtures preparation done.');
})().then();