"use strict";

exports.index = async (ctx) => {
    await ctx.render('reactPage', {
        title: '{{ pageComponent }}',
        page: '{{ page }}'
    });
};