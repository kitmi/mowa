"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const Util = require('../util.js');
const SocketServer = require('socket.io');

function getEventHandler(webModule, controllerBasePath, handlerName, isMiddleware = false) {
    let pos = handlerName.lastIndexOf('.');
    if (pos < 0) {
        if (isMiddleware)
            webModule.invalidConfig('socketRpc.channels.' + name + '.middlewares', `Invalid middleware reference: ${handlerName}`);
        else
            webModule.invalidConfig('socketRpc.channels.' + name + '.events', `Invalid event handler reference: ${handlerName}`);
    }

    let controller = handlerName.substr(0, pos);
    let action = handlerName.substr(pos + 1);

    let controllerPath = path.resolve(controllerBasePath, controller + '.js');
    let ctrl = require(controllerPath);
    let middlewareHandler = ctrl[action];
    if (!middlewareHandler) {
        if (isMiddleware)
            webModule.invalidConfig('socketRpc.channels.' + name + '.middlewares', `Middleware function not found: ${handlerName}`);
        else
            webModule.invalidConfig('socketRpc.channels.' + name + '.events', `Event handler function not found: ${handlerName}`);
    }

    return middlewareHandler;
}

module.exports = {

    type: Util.Feature.ENGINE,

    load: function (webModule, config) {
        webModule.on('after:' + Util.Feature.ENGINE, () => {
            let io, standalone = false;

            if (config.port) {
                io = new SocketServer();
                standalone = true;
            } else {
                io = new SocketServer(webModule.hostingHttpServer)
            }

            let logger;
            if (config.logger) {
                logger = webModule.getLoggerById(config.logger);
            }

            if (Util._.isEmpty(config.channels)) {
                webModule.invalidConfig('socketRpc.channels', 'Missing channels config.');
            }

            let controllerPath = webModule.toAbsolutePath(webModule.options.backendPath, config.controllerPath || 'socketRpc');

            Util._.forOwn(config.channels, (info, name) => {
                console.log('RPC channel: ' + name);

                let ioChannel = io.of(name);

                if (logger) {
                    ioChannel.use((socket, next) => {
                        next && next();
                        logger.info('Access from [' + socket.id + '].');
                        return null;
                    });
                }

                if (info.middlewares) {
                    let m = Array.isArray(info.middlewares) ? info.middlewares : [ info.middlewares ];
                    m.forEach(middlewareName => {
                        ioChannel.use(getEventHandler(webModule, controllerPath, middlewareName, true));
                    });
                }

                let eventHandlers = {};

                if (info.events) {
                    Util._.forOwn(info.events, (handler, event) => {
                        eventHandlers[event] = getEventHandler(webModule, controllerPath, handler);
                    });
                }

                ioChannel.on('connection', function (socket) {
                    //Register event handlers
                    Util._.forOwn(eventHandlers, (handler, event) => {
                        socket.on(event, data => handler(socket, data));
                    });

                    console.log('Client connected.');
                    console.log(socket.request);

                    socket.emit('welcome', { payload: 'xxx' });
                });
            });

            if (standalone && !webModule.serverModule.options.deaf) {
                io.listen(config.port);
                webModule.log('info', `A socket RPC server is listening on port [${config.port}] ...`);
            }
        });

        return Promise.resolve();
    }
};