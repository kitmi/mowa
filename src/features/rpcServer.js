"use strict";

/**
 * @module Feature_RpcServer
 * @summary Socket based Rpc Server
 */

const path = require('path');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const _ = Util._;
const Promise = Util.Promise;
const SocketServer = require('socket.io');

function loadEventHandler(appModule, channelName, controllerBasePath, handlerName, isMiddleware = false) {
    let pos = handlerName.lastIndexOf('.');
    if (pos < 0) {
        if (isMiddleware) {
            throw new Mowa.Error.InvalidConfiguration(
                `Invalid middleware reference: ${handlerName}`,
                appModule,
                `rpgServer.channels.${channelName}.middlewares`
            );
        } else {
            throw new Mowa.Error.InvalidConfiguration(
                `Invalid event handler reference: ${handlerName}`,
                appModule,
                `rpgServer.channels.${channelName}.events`
            );
        }
    }

    let controller = handlerName.substr(0, pos);
    let action = handlerName.substr(pos + 1);

    let controllerPath = path.resolve(controllerBasePath, controller + '.js');
    let ctrl = require(controllerPath);
    let middlewareHandler = ctrl[action];
    if (typeof middlewareHandler !== 'function') {
        if (isMiddleware) {
            throw new Mowa.Error.InvalidConfiguration(
                `Middleware function not found: ${handlerName}`,
                appModule,
                `rpgServer.channels.${channelName}.middlewares`
            );
        } else {
            throw new Mowa.Error.InvalidConfiguration(
                `Event handler function not found: ${handlerName}`,
                appModule,
                `rpgServer.channels.${channelName}.events`
            );
        }
    }

    return middlewareHandler;
}

module.exports = {

    /**
     * This feature is loaded at engine stage
     * @member {string}
     */
    type: Mowa.Feature.ENGINE,

    /**
     * Load the rpc Server
     * @param {AppModule} appModule - The app module object
     * @param {Object} config - Rpc server config
     * @property {string} [config.path] - The path of socket server
     * @property {int} [config.port] - The port number of the server
     * @property {Object.<string, Object>} [config.channels] - Channels
     * @returns {Promise.<*>}
     */
    load_: function (appModule, config) {
        if (appModule.serverModule.options.deaf) {
            return Promise.resolve();
        }

        appModule.on('after:' + Mowa.Feature.ENGINE, () => {
            let io, standalone = false;

            let listeningPath = Util.urlJoin(appModule.route, config.path);

            if (config.port) {
                io = new SocketServer();
                standalone = true;
            } else {
                io = new SocketServer(appModule.hostingHttpServer)
            }

            let logger;
            if (config.logger) {
                logger = appModule.getService('logger:' + config.logger);
            }

            if (_.isEmpty(config.channels)) {
                throw new Mowa.Error.InvalidConfiguration(
                    'Missing channels config.',
                    appModule,
                    'rpgServer.channels'
                );
            }

            let controllerPath = path.join(appModule.backendPath, Mowa.Literal.REMOTE_CALLS_PATH);

            _.forOwn(config.channels, (info, name) => {
                let ioChannel = io.of(name);

                if (logger) {
                    ioChannel.use((socket, next) => {
                        next && next();
                        logger.info('Access from [' + socket.id + '].');
                    });
                }

                if (info.middlewares) {
                    let m = Array.isArray(info.middlewares) ? info.middlewares : [ info.middlewares ];
                    m.forEach(middlewareName => {
                        ioChannel.use(loadEventHandler(appModule, name, controllerPath, middlewareName, true));
                    });
                }

                let eventHandlers = {};

                if (info.events) {
                    Util._.forOwn(info.events, (handler, event) => {
                        eventHandlers[event] = loadEventHandler(appModule, name, controllerPath, handler);
                    });
                }

                ioChannel.on('connection', function (socket) {
                    //Register event handlers
                    _.forOwn(eventHandlers, (handler, event) => {
                        socket.on(event, data => handler(socket, data));
                    });

                    console.log('Client connected.');
                    console.log(socket.request);

                    socket.emit('welcome', { payload: 'xxx' });
                });
            });

            if (standalone) {
                io.listen(config.port);
                appModule.log('info', `A socket RPC server is listening on port [${config.port}] ...`);
            }
        });

        return Promise.resolve();
    }
};