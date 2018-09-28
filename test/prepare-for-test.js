'use strict';

/**
 * Module dependencies.
 */

const path = require('path');
const Mowa = require('../lib/server.js');
const Util = Mowa.Util;
const fs = Util.fs;

const { run_, mowa_ } = require('./test-utils.js');

const BIN_PATH = path.resolve(__dirname, '..', 'bin');
const TEST_WORK_FOLDER = path.resolve(__dirname, 'temp', 'fixtures');
const TEST_PROJECTS_FOLDER = path.join(TEST_WORK_FOLDER, 'projects');
const MOWA_CLI_CMD = `node ${BIN_PATH}/mowa.js --skip-update-check `;
const MOWA_PATH = path.resolve(__dirname, '..');

// Copy all fixtures to test working folder
const FIXTURES_PATH = path.resolve(__dirname, 'fixtures');
fs.emptyDirSync(TEST_WORK_FOLDER);
fs.copySync(FIXTURES_PATH, TEST_WORK_FOLDER);

// Update mowa reference path in all package.json
fs.readdirSync(TEST_PROJECTS_FOLDER).forEach(folder => {
    let p = path.join(TEST_PROJECTS_FOLDER, folder);
    if (fs.statSync(p).isDirectory()) {
        let pkgFile = path.join(p, 'package.json');
        if (fs.existsSync(pkgFile)) {
            let pkg = require(pkgFile);
            pkg.dependencies.mowa = 'file://' + MOWA_PATH;
            fs.writeJsonSync(pkgFile, pkg);
        }
    }
});

(async () => {
    console.log('Preparing test fixtures ...');        

    const CLI_APP_TEST_FOLDER = path.join(TEST_PROJECTS_FOLDER, 'cli-app');
    process.chdir(CLI_APP_TEST_FOLDER);  

    await mowa_('app create --app=test --override');

    process.chdir(TEST_WORK_FOLDER);  
    await run_('lerna bootstrap');

    console.log('Test fixtures preparation done.');
})().then();