"use strict";

const Mowa = require('mowa');

let mowa = new Mowa('{{ serverName }}', { logger: 'general' });

mowa.start_().then(() => {
    //started
}).catch(error => {
    console.error(error);
});