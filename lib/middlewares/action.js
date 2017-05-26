"use strict";

require('debug')('tracing')(__filename);

module.exports = (controllerAction, webModule) => {
    let pos = controllerAction.lastIndexOf('.');
    if (pos < 0) {
        webModule.invalidConfig('action', `Unrecognized controller & action syntax: ${controllerAction}.`);
    }

    let controller = controllerAction.substr(0, pos);
    let action = controllerAction.substr(pos + 1);

    let controllerPath = webModule.toAbsolutePath(controller + '.js');
    let ctrl = require(controllerPath);

    var actioner = ctrl[action];
    if (typeof actioner !== 'function') {
        webModule.invalidConfig('action', `${controllerAction} is not a valid action.`);
    }

    return function* (next) {
        this.webModule = webModule;
        
        this.viewState = {
            _module: {
                basePath: webModule.route,
                serverUrl: this.origin,
                currentUrl: this.href                    
            },
            _util: {
                __: this.__,
                makePath: (relativePath, query) => {
                    return webModule.toWebPath(relativePath, query);
                },
                makeUrl: (relativePath, query) => {
                    return this.origin + webModule.toWebPath(relativePath, query);
                }
            }            
        };
        
        yield actioner.call(this, next);        
        
        this.webModule.emit('actionCompleted');
    };
};