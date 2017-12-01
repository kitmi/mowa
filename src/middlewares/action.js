"use strict";

require('debug')('tracing')(__filename);

module.exports = (controllerAction, appModule) => {
    let pos = controllerAction.lastIndexOf('.');
    if (pos < 0) {
        appModule.invalidConfig('action', `Unrecognized controller & action syntax: ${controllerAction}.`);
    }

    let controller = controllerAction.substr(0, pos);
    let action = controllerAction.substr(pos + 1);

    let controllerPath = appModule.toAbsolutePath(controller + '.js');
    let ctrl = require(controllerPath);

    var actioner = ctrl[action];
    if (typeof actioner !== 'function') {
        appModule.invalidConfig('action', `${controllerAction} is not a valid action.`);
    }

    return function* (next) {
        this.appModule = appModule;
        
        this.viewState = {
            _module: {
                basePath: appModule.route,
                serverUrl: this.origin,
                currentUrl: this.href                    
            },
            _util: {
                __: this.__,
                makePath: (relativePath, query) => {
                    return appModule.toWebPath(relativePath, query);
                },
                makeUrl: (relativePath, query) => {
                    return this.origin + appModule.toWebPath(relativePath, query);
                }
            }            
        };
        
        yield actioner.call(this, next);        
        
        this.appModule.emit('actionCompleted');
    };
};