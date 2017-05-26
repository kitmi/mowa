"use strict";

const Linker = require('./lang/linker.js');
const Modeler = require('./modeling/db.js');
const Generator = require('./modeling/model.js');
const deploy = require('./deploy');
const importData = require('./deploy/import.js');

exports.deploy = deploy;

exports.import = importData;

exports.build = function (context, options) {
    let linker = new Linker(context, {oolPath: options.oolPath});
    linker.link(options.schemaPath);

    let modeler = new Modeler(linker, {buildPath: options.sqlScriptPath});
    let schemas = modeler.modeling();

    let generator = new Generator(linker, {buildPath: options.modelPath});
    generator.generate(schemas);
};