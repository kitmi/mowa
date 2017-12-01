"use strict";

exports.index = function* () {
    this.body = yield this.render('reactPage', {
        title: '{{ pageComponent }}',
        page: '{{ page }}'
    });
};