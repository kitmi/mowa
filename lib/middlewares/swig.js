"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const koaMiddlwareSwig = require('koa-middleware-swig');

let swig = (opt, appModule) => {
    opt.views = appModule.toAbsolutePath(opt.views || path.join(appModule.options.backendPath, 'views'));
    return koaMiddlwareSwig(opt);
};

module.exports = swig;