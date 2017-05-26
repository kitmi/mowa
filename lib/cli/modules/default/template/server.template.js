"use strict";

const Mowa = require('mowa');

let mowa = new Mowa('{{ serverName }}', { verbose: true });

mowa.start();