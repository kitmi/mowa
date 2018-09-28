'use strict';

/**
 * Module dependencies.
 */

const request = require('supertest');
const path = require('path');
const Mowa = require('../lib/server.js');
const Util = Mowa.Util;

const BIN_PATH = path.resolve(__dirname, '..', 'bin');
const MOWA_CLI_CMD = `node ${BIN_PATH}/mowa.js --skip-update-check `;
const TEST_NEW_PROJECT_FOLDER = path.resolve(__dirname, 'temp', 'new');
const TEST_CLI_BASIC_FOLDER = path.resolve(__dirname, 'temp', 'fixtures', 'projects', 'cli-basic');

describe('mowa-cli', function () {
    describe('mowa -v', function () {
        it('Should return correct version', async function() {
            let output = await Mowa.Util.runCmd_(MOWA_CLI_CMD + '-v');
            
            const pkg = require('../package.json');            
            output.stderr.should.be.empty();
            output.stdout.trim().should.equal('v' + pkg.version);
        });        
    });

    describe('mowa', function() {
        it('Should show usage', async function() {    
            let output = await Mowa.Util.runCmd_(MOWA_CLI_CMD);        
            output.stderr.should.be.empty();
            output.stdout.should.containEql('Usage');
        });
    });

    describe('mowa init', function () {        
        describe('--lib=false --name=test --skip-npm-install', function () {
            let output;

            before(async function() {
                Util.fs.emptyDirSync(TEST_NEW_PROJECT_FOLDER);     
                process.chdir(TEST_NEW_PROJECT_FOLDER);     
                output = await Mowa.Util.runCmd_(MOWA_CLI_CMD + 'init --lib=false --name=test --skip-npm-install');
            });

            after(function() {
                //Util.fs.removeSync(TEST_NEW_PROJECT_FOLDER);
            });       

            it('no stderr', function () {                        
                output.stderr.should.be.empty();
            });

            it('required files exist', function () {                
                const etcFile = path.join(TEST_NEW_PROJECT_FOLDER, 'etc', 'server.default.json');
                Util.fs.existsSync(etcFile).should.ok();

                const lernaFile = path.join(TEST_NEW_PROJECT_FOLDER, 'lerna.json');
                Util.fs.existsSync(lernaFile).should.ok();                
            });
            
            it('package file exist and name is correct', function () {
                const packageFile = path.join(TEST_NEW_PROJECT_FOLDER, 'package.json');
                const pkg = require(packageFile);
                pkg.name.should.equal('test');            
            });

            it('no node_modules', function () {
                const nodeModulesPath = path.join(TEST_NEW_PROJECT_FOLDER, 'node_modules');
                Util.fs.existsSync(nodeModulesPath).should.be.false();
            });
        });    
    });

    describe('mowa app', function () {          
        before(function() { 
            process.chdir(TEST_CLI_BASIC_FOLDER);  
        });    
        
        describe('npm run bulid && npm start', function () {            
            let output;

            before(async function () {     
                output = await Mowa.Util.runCmd_('npm run build');                
            });  

            it('lerna stderr', function () {                  
                output.stderr.endsWith('lerna success exec Executed command in 0 packages: "npm run build"\n').should.ok();              
            });

            it('build folder exist', function () {       
                const serverFile = path.join(TEST_CLI_BASIC_FOLDER, 'build', 'server.js');
                Util.fs.existsSync(serverFile).should.ok();
            });

            it('should start successfully', function (done) {                         
                let server = new Mowa('cli-test', {  backendPath: 'build/server' });
                server.start_().then(() => {
                    request(server.httpServer)
                    .get('/')
                    .expect('content-type', 'text/html; charset=utf-8')
                    .expect('<html><body><h1>A journey of a thousand miles begins with a single step.</h1></body></html>')
                    .expect(200)
                    .end(err => {
                        server.stop_().then(() => { done(err); });
                    });
                });                
            });
        });           
        
        describe('create --app --override', function () {
            const appName = 'test';
            let output;

            before(async function() {  
                output = await Mowa.Util.runCmd_(MOWA_CLI_CMD + `app create --app=${appName} --override`);
            });                  

            it('no stderr', function () {                                    
                output.stderr.should.be.empty();
            });

            it('app folder exist', function () {                  
                const etcFile = path.join(TEST_CLI_BASIC_FOLDER, 'app_modules', appName, 'etc', 'app.default.json');
                Util.fs.existsSync(etcFile).should.ok();
            });

            it('remove --app -y', async function () {   
                output = await Mowa.Util.runCmd_(MOWA_CLI_CMD + `app remove --app=${appName} -y`);               
                const appFolder = path.join(TEST_CLI_BASIC_FOLDER, 'app_modules', appName);
                Util.fs.existsSync(appFolder).should.be.false();
            });

            it('should start successfully', async function () {
                let server = new Mowa('cli-test', {  backendPath: 'build/server' });
                await server.start_();

                await request(server.httpServer)
                    .get('/')
                    .expect('content-type', 'text/html; charset=utf-8')
                    .expect('<html><body><h1>A journey of a thousand miles begins with a single step.</h1></body></html>')
                    .expect(200);

                await request(server.httpServer)
                    .get('/' + appName)
                    .expect(404);
                
                await server.stop_();
            });
        }); 
    });
});