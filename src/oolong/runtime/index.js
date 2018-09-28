"use strict";

const path = require('path');
const Util = require('../../util.js');
const Types = require('./types.js');
const Errors = require('./errors.js');
const Convertors = require('./convertors.js');
const Validators = require('./validators.js');
const Generators = require('./generators.js');

const basePath = path.resolve(__dirname, '..', 'lang', 'features');
let features = Util.fs.readdirSync(basePath);

let Features = {};

features.forEach(file => {
    let f = path.join(basePath, file);
    if (Util.fs.statSync(f).isFile() && Util._.endsWith(file, '.js')) {
        let g = path.basename(file, '.js');
        let feature = require(f);

        if (feature.__metaRules) {
            Util._.forOwn(feature.__metaRules, (rules, scenario) => {
                Features[g+'.'+scenario] = rules;
            })            
        }
    }
});

module.exports = { Types, Errors, Convertors, Validators, Generators, Features };