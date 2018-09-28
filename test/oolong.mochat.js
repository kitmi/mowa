'use strict';

/**
 * Module dependencies.
 */

const path = require('path');
const request = require('supertest');
const Mowa = require('../temp/server.js');

const TEMP_FOLDER = path.resolve(__dirname, 'temp');

let server;

describe.only('mowa-oolong', function () {
    
    before(function () {
        Mowa.Util.fs.emptyDirSync(TEMP_FOLDER);
        server = new Mowa('MowaBVT', { etcPath: 'test/etc-oolong', modulePath: 'test/temp' });
    });

    after(function () {
        Mowa.Util.fs.emptyDirSync(TEMP_FOLDER);
    });
    
    describe('Prepare test env', function () {
        it('Should return ok', function (done) {
            server.start_().then(() => {
                request(server.httpServer)
                    .get('/')
                    .expect('content-type', 'text/plain; charset=utf-8')
                    .expect('OK')
                    .expect(200)
                    .end((err) => {
                        server.stop_().then(() => { done(err); });
                    });
            });
        });
    });
    
});