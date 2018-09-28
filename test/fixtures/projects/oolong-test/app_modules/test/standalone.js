"use strict";

const Mowa = require('mowa');

let mowa = new Mowa('test', { oneAppMode: true, childModulesPath: '..', verbose: true });

mowa.start_().then(() => {
    //started
}).catch(error => {
    console.error(error);
});