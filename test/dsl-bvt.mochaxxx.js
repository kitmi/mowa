'use strict';

/**
 * Module dependencies.
 */

const request = require('supertest');
const should = require('should');
const util = require('util');
const Mowa = require('../lib/mowa.js');

describe('dsl-bvt', function () {
    describe('basic features and functions', function () {
        it('should return a special header', function (done) {
            let mowa = createMowa();

            mowa.start().once('started', function () {
                request(mowa.server)
                    .get('/')
                    .expect('X-TEST-HEADER', 'For test only')
                    .expect(200)
                    .end((err) => {
                        if (err) return done(err);
                        mowa.stop().once('stopped', () => { done(); });
                    });
            });
        });
    });
});