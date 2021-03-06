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
    pre: controllerAction, Util.Message.DBC_ARG_REQUIRED;

    if (!_.isString(controllerAction)) {
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
    let ctrl = require(controllerPath);

    let actioner = ctrl[action];
    if (typeof actioner !== 'function') {
        throw new Mowa.Error.InvalidConfiguration(`${controllerAction} is not a valid action.`, appModule);
    }

    return async (ctx, next) => {
        appModule.prepareActionContext(ctx);

        await actioner(ctx);

        return next();
    };
};