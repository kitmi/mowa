"use strict";

exports.index = function* () {
    this.body = yield this.render('index', {title: 'Test.index', name: 'Swig'});
};

