"use strict";

require('debug')('tracing')(__filename);

const doT = require('dot');
const path = require('path');
const Util = require('../util.js');

let dotMiddleware = (opt, appModule) => {
    let views = path.join(appModule.backendPath, opt.views || 'views');
    let defaultExt = opt.ext || 'dot';
    let defaultEncoding = opt.encoding || 'utf8';
    let viewState = opt.viewState;
    opt = Util._.omit(opt, ['views', 'ext', 'encoding', 'viewState']);

    let doTSettings, render;

    if (appModule.env === 'production') {
        doTSettings = Object.assign({}, doT.templateSettings, opt);
        let dots = doT.process({ path: views, destination: path.join(views, "compiled"), templateSettings: doTSettings });
        
        render = function* (view, localState) {
            let e = path.extname(view);
            if (e) {
                view = path.basename(view, e);
            }
            
            if (!dots[view]) {
                this.throw(`View [${view}] not found!`);
            }

            _.defaultsDeep(localState, viewState, this.viewState);

            return dots[view](localState);
        };
    } else {
        doTSettings = Object.assign({strip: false}, doT.templateSettings, opt);

        render = function* (view, localState) {
            // extname
            let e = path.extname(view);

            if (!e) {
                view += '.' + defaultExt;
            }

            view = path.resolve(views, view);

            Util._.defaultsDeep(localState, viewState, this.viewState);

            return yield (done => Util.fs.readFile(view, defaultEncoding, (err, content) => {
                if (err) return done(err);

                let tmpl = doT.template(content, doTSettings);
                let result = tmpl(localState);
                done(null, result);
            }));
        };
    }

    return function* (next) {
        this.doT = doT;
        this.render = render;

        yield next;

        delete this.render;
        delete this.doT;
    };
};

module.exports = dotMiddleware;