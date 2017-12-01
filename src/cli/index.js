"use strict";

const modules = require('./modules/');
const CliApi = require('./cli-api.js');
const { restart } = require('./cli-util.js');
const checkUpdate_ = require('./update.js');

console.log(`Mowa Development & Deployment CLI Helper v${checkUpdate_.version}\n`);

const api = new CliApi(modules);

let env = api.getOption('env');
if (process.env.NODE_ENV && env !== process.env.NODE_ENV) {
    console.warn(`The current environment is "${process.env.NODE_ENV}". The program will be restarted in "${env}" mode.`);

    restart(env);
} else {
    api.init_()
        .then(() => api.skipUpdateCheck ? Promise.resolve() : checkUpdate_())
        .then(() => api.commandHanlder_(api))
        .then(()=> {
            if (api.command !== 'help') {
                api.log('info', 'done.');
            }

            process.exit(0);
        }).catch(e => {
            api.log('error', e.stack ? e.stack : e);
            process.exit(1);
        });
}