"use strict";

const Mowa = require('mowa');

let mowa = new Mowa('{{name}}', { oneAppMode: true, modulesPath: '..', verbose: true });

mowa.start();