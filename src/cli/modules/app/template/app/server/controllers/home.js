"use strict";

exports.index = async (ctx) => {
    await ctx.render('index', { title: 'A new mowa app' });
};