const fs = require('fs');
const path = require('path');

const modules = {};
module.exports = modules;

// Load all subdirectories as Mowa deploy modules.
// The directory name is the module name.
fs.readdirSync(__dirname)
    .filter(isMowaModule)
    .forEach(loadModule);

function isMowaModule(name) {
    const moduleDir = path.join(__dirname, name);
    return fs.statSync(moduleDir).isDirectory();
}

function loadModule(name) {
    const moduleDir = path.join(__dirname, name);
    modules[name] = require(moduleDir);
}
