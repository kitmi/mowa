"use strict";

const Mowa = require('mowa');

let mowa = new Mowa('cli-test', { logger: 'general', backendPath: 'build/server' });

mowa.start_().then(() => {
    //started
}).catch(error => {
    console.error(error);
});