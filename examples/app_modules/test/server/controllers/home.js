"use strict";

exports.index = function* () {
    this.body = yield this.render('index', { title: 'A new mowa app' });
};