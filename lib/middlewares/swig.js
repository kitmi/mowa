"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const koaMiddlwareSwig = require('koa-middleware-swig');

let swig = (opt, webModule) => {
    opt.views = webModule.toAbsolutePath(opt.views || path.join(webModule.options.backendPath, 'views'));
    return koaMiddlwareSwig(opt);
};

module.exports = swig;