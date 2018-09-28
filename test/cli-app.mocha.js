'use strict';

/**
 * Module dependencies.
 */

const request = require('supertest');
const path = require('path');
const Mowa = require('../lib/server.js');
const Util = Mowa.Util;

const { run_ } = require('./test-utils.js');

const TEST_CLI_APP_FOLDER = path.resolve(__dirname, 'temp', 'fixtures', 'projects', 'cli-app');

describe('mowa app create function verify', function () {
    before(async function () {
        process.chdir(TEST_CLI_APP_FOLDER);
        await run_('npm run build');
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
            .get('/test')
            .expect('content-type', 'text/html; charset=utf-8')
            .expect('<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>A new mowa app</title>\n</head>\n<body>\n    <h1>A new mowa app</h1>\n</body>\n</html>')
            .expect(200);    

        await server.stop_();
    });
});