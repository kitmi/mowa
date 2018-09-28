"use strict";

/**
 * @module Middleware_Action
 * @summary Response action as middleware
 */

const Mowa = require('../server.js');
const Util = Mowa.Util;
const _ = Util._;

const path = require('path');

module.exports = (controllerAction, appModule) => {
    pre: {
        controllerAction, Util.Message.DBC_ARG_REQUIRED;
        appModule, Util.Message.DBC_ARG_REQUIRED;
    }

    if (typeof controllerAction !== 'string') {
        throw new Mowa.Error.InvalidConfiguration('Invalid action syntax.', appModule);
    }

    let pos = controllerAction.lastIndexOf('.');
    if (pos < 0) {
        throw new Mowa.Error.InvalidConfiguration(`Unrecognized controller & action syntax: ${controllerAction}.`, appModule);
    }

    let controller = controllerAction.substr(0, pos);
    let action = controllerAction.substr(pos + 1);
    let controllerBasePath = path.join(appModule.backendPath, Mowa.Literal.CONTROLLERS_PATH);

    let controllerPath = path.resolve(controllerBasePath, controller + '.js');
    let ctrl;
    
    try {
        ctrl = require(controllerPath);    
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            throw new Mowa.Error.InvalidConfiguration(
                `Controller "${controller}" not found.`,
                appModule
            );
        }
    }

    let actioner = ctrl[action];
    /*
    if (Array.isArray(actioner)) {
        if (undefined !== _.find(actioner, a => typeof a !== 'function')) {
            throw new Mowa.Error.InvalidConfiguration(`${controllerAction} is not a valid action.`, appModule);
        }

        const beforeAction = (ctx, next) => {
            appModule.prepareActionContext(ctx);
            return next();
        }

        return [ beforeAction ].concat(actioner);
    }*/

    if (typeof actioner !== 'function') {
        throw new Mowa.Error.InvalidConfiguration(`${controllerAction} is not a valid action.`, appModule);
    }

    return appModule.wrapAction(actioner);
};