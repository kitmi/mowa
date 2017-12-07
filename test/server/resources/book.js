"use strict";

const Mw = require('../../../temp/server.js');

let books = [ { id: 1, title: 'Book 1' }, { id: 2, title: 'Book 2' } ];
let maxid = 2;

exports.query = (ctx) => {
    ctx.body = books;
};

exports.create = (ctx) => {
    let newBook = {id: ++maxid, title: ctx.request.fields.title};
    books.push(newBook);
    ctx.body = newBook;
};

exports.get = (ctx) => {
    let id = ctx.params.id;
    ctx.body = Mw.Util._.find(books, book => book.id == id) || {};
};

exports.update = (ctx) => {
    let id = ctx.params.id;
    let bookFound = Mw.Util._.find(books, book => book.id == id);

    bookFound.title = ctx.request.fields.title;
    ctx.body = bookFound;
};

exports.remove = (ctx) => {
    let id = ctx.params.id;
    let idx = Mw.Util._.findIndex(books, book => book.id == id);
    ctx.body  = books.splice(idx, 1);
};
