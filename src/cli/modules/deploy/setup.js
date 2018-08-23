"use strict";

const Util = require('../../../util.js');
const _ = Util._;
const Promise = Util.Promise;

module.exports = {
    timezone_: async (session, itemConfig, logger, sudo) => {
        if (itemConfig.indexOf('/') <= 0) {
            return Promise.reject('Invalid timezone setting: ' + itemConfig);
        }

        return session.ssh.execCommand(`test -f "/usr/share/zoneinfo/${itemConfig}"`).then(result => {
            if (result.code !== 0) return Promise.reject('Unsupported time zone: ' + itemConfig);

            return session.ssh.execCommand(`sudo cp /usr/share/zoneinfo/${itemConfig} /etc/localtime`);
        }).then(result => {
            if (result.code !== 0) return Promise.reject(`Failed to change time zone.\nError: ${result.stderr}`);

            logger.info('Timezone set to: ' + itemConfig);
        });
    },

    firewall_: async (session, itemConfig, logger, sudo) => {
        if (!_.isPlainObject(itemConfig)) {
            return Promise.reject('Invalid firewall setting: ' + itemConfig);
        }
        
        if (!_.isEmpty(itemConfig.allow)) {
            await Util.eachAsync_(itemConfig.allow, async port => {
                let cmd = (sudo ? 'sudo ' : '') + `ufw allow ${port}`;
                logger.verbose(cmd);
                let result = await session.ssh.execCommand(cmd);       
                
                if (result.code !== 0) {
                    return Promise.reject(`Failed to run cmd "${cmd}".\nError: ${result.stderr}`);
                }

                logger.verbose(result.stdout);
            });            
        }

        let cmd = 'echo y |' + (sudo ? 'sudo ' : '') + `ufw enable`;
        logger.verbose(cmd);
        let result = await session.ssh.execCommand(cmd);

        if (result.code !== 0) {
            return Promise.reject(`Failed to run cmd "${cmd}".\nError: ${result.stderr}`);
        }

        logger.verbose(result.stdout);
    }
};