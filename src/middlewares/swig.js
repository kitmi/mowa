"use strict";

require('debug')('tracing')(__filename);

const Util = require('../util.js');
const path = require('path');
const koaMiddlwareSwig = require('koa-middleware-swig');

let swig = (opt, appModule) => {
    opt.views = opt.views ? appModule.toAbsolutePath(opt.views) : path.join(appModule.backendPath, Util.Literal.VIEWS_PATH);
    return koaMiddlwareSwig(opt);
};

module.exports = swig;