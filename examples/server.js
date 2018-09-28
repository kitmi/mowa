"use strict";

const Mowa = require('..');

let mowa = new Mowa('examples', { logger: 'general', verbose: true });

mowa.start_().then(() => {}).catch(error => {
    console.error(error);
});