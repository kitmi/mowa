"use strict";

const Mowa = require('mowa');

let mowa = new Mowa('cli-test', { logger: 'general' });

mowa.start_().then(() => {
    //started
}).catch(error => {
    console.error(error);
});