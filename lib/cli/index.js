"use strict";

const modules = require('./modules/');
const MowaAPI = require('./mowa-api.js');
const { restart } = require('./cli-util.js');

const api = new MowaAPI(modules);

let env = api.getOption('env');
if (process.env.NODE_ENV && env !== process.env.NODE_ENV) {
    console.warn(`The current environment is "${process.env.NODE_ENV}". The program will be restarted in "${env}" mode.`);

    restart(env);
} else {
    api.init().then(() => {
        (api.skipUpdateCheck ? Promise.resolve() : api.checkUpdate()).then(
            () => Promise.resolve(api.commandHanlder(api))
        ).then(
            ()=> {
                if (api.command !== 'help') {
                    console.log('done.');
                }

                process.exit(0);
            }
        ).catch(
            e => {
                api.log('error', e.stack ? e.stack : e);
                process.exit(1);
            }
        );
    });
}