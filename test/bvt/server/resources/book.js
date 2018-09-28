"use strict";

const Mw = require('../../../../lib/server.js');

let books = [ { id: 1, title: 'Book 1' }, { id: 2, title: 'Book 2' } ];
let maxid = 2;

exports.query = (ctx) => {
    return books;
};

exports.create = (ctx) => {
    let newBook = {id: ++maxid, title: ctx.request.body.title};
    books.push(newBook);
    return newBook;
};

exports.detail = (ctx) => {
    let id = ctx.params.id;
    return Mw.Util._.find(books, book => book.id == id) || {};
};

exports.update = (ctx) => {
    let id = ctx.params.id;
    let bookFound = Mw.Util._.find(books, book => book.id == id);

    bookFound.title = ctx.request.body.title;
    return bookFound;
};

exports.remove = (ctx) => {
    let id = ctx.params.id;
    let idx = Mw.Util._.findIndex(books, book => book.id == id);
    return books.splice(idx, 1);
};
