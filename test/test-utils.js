const path = require('path');
const Mowa = require('../lib/server.js');
const Util = Mowa.Util;
const fs = Util.fs;

const BIN_PATH = path.resolve(__dirname, '..', 'bin');
const MOWA_CLI_CMD = `node ${BIN_PATH}/mowa.js --skip-update-check `;

async function run_(cmd, args) {
    if (arguments.length === 1) {        
        args = cmd.split(' ');
        cmd = args.shift();
    }

    return Util.runCmdLive_(
        cmd, 
        args, 
        o => console.log(o.toString()), 
        e => console.log(e.toString())
    ).catch(err => { console.log(err); throw err; });    
}

async function mowa_(cmd) {
    return run_(MOWA_CLI_CMD + cmd);   
}

function replaceMowaDep(pkgFile, mowaPath) {
    let pkg = fs.readJsonSync(pkgFile);
    pkg.dependencies.mowa = 'file://' + mowaPath;
    fs.writeJsonSync(pkgFile, pkg, {spaces: 4});
}

exports.run_ = run_;
exports.mowa_ = mowa_;
exports.replaceMowaDep = replaceMowaDep;