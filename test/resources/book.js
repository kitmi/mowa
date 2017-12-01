"use strict";

const Mw = require('../../temp/server.js');

let books = [ { id: 1, title: 'Book 1' }, { id: 2, title: 'Book 2' } ];
let maxid = 2;

exports.query = function* (next) {
    this.body = books;
};

exports.create = function* (next) {
    let newBook = {id: ++maxid, title: this.request.body.fields.title};
    books.push(newBook);
    this.body = newBook;
};

exports.get = function* (next) {
    let id = this.params.id;
    this.body = Mw.Util._.find(books, book => book.id == id) || {};
};

exports.update = function* (next) {
    let id = this.params.id;
    let bookFound = Mw.Util._.find(books, book => book.id == id);
    bookFound.title = this.request.body.fields.title;
    this.body = bookFound;
};

exports.del = function* (next) {
    let id = this.params.id;
    let idx = Mw.Util._.findIndex(books, book => book.id == id);
    this.body  = books.splice(idx, 1);
};
