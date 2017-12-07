'use strict';

/**
 * Module dependencies.
 */

const request = require('supertest');
const should = require('should');
const util = require('util');
const Mowa = require('../temp/server.js');

function createMowa() {
    return new Mowa('MowaBVT', { logger: 'general', modulePath: 'test' });
}

describe('mowa-bvt', function () {
    describe('basic features and functions', function () {
        it('should return a special header', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .get('/')
                    .expect('X-TEST-HEADER', 'For test only')
                    .expect(200)
                    .end((err) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
    });
    describe('serveStatic', function () {
        it('should return static page by visiting web root', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .get('/')
                    .expect('content-type', 'text/html; charset=utf-8')
                    .expect(/<title>Static Page<\/title>/)
                    .expect(200)
                    .end((err) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
        it('should return static page by visiting the page url', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .get('/text-file.txt')
                    .expect('content-type', 'text/plain; charset=utf-8')
                    .expect('This is a test file.')
                    .expect(200)
                    .end((err) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
    });
    describe('rule router', function () {
        it('should return a page rendered by swig', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .get('/test')
                    .expect('content-type', 'text/html; charset=utf-8')
                    .expect(/<title>Test.index<\/title>/)
                    .expect(200)
                    .end((err, res) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
    });
    describe('rest router', function () {
        it('should get a list of books', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .get('/api/book')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function(res) {
                        if (!util.isArray(res.body)) {
                            return 'Result is not a list';
                        }

                        if (res.body.length !== 2) {
                            return 'Unexpected result';
                        }
                    })
                    .end((err) => {
                        mowa.stop_().then(() => {
                            done(err);
                        });
                    });
            });
        });
        it('should add a new book', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .post('/api/book')
                    .send({title: 'Avatar'})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect({id: 3, title: 'Avatar'})
                    .end((err, res) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
        it('should get book 2 successfully', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .get('/api/book/2')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect({id: 2, title: 'Book 2'})
                    .end((err) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
        it('should update book 2 successfully', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .put('/api/book/2')
                    .send({title: 'Brave Cross'})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect({id: 2, title: 'Brave Cross'})
                    .end((err) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
        it('should delete book 2 successfully', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .del('/api/book/2')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect({id: 2, title: 'Book 2'})
                    .end(() => {});

                request(mowa.httpServer)
                    .get('/api/book/2')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect({})
                    .end((err) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
        it('should return 404', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .get('/api/non_exist/1')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', 'text/plain; charset=utf-8')
                    .expect(404)
                    .end((err) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
    });
    describe('mod router', function () {
        it('should return a text file in test module', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .get('/submodule/text-file.txt')
                    //.expect('content-type', 'text/plain; charset=utf-8')
                    //.expect('This is a test file in submodule.')
                    .expect(200)
                    .end((err) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
        it('should return a page rendered by a controller', function (done) {
            let mowa = createMowa();

            mowa.start_().then(() => {
                request(mowa.httpServer)
                    .get('/submodule/test')
                    .expect('content-type', 'text/html; charset=utf-8')
                    .expect(/<title>Test.index<\/title>/)
                    .expect(200)
                    .end((err) => {
                        mowa.stop_().then(() => { done(err); });
                    });
            });
        });
    });
});