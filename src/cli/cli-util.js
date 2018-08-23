"use strict";

const spawn = require('child_process').spawn;

exports.restart = function (env) {
    let cp = spawn(process.argv[0], process.argv.slice(1), {
        env: Object.assign({}, process.env, { NODE_ENV: env }),
        stdio: [process.stdin, process.stdout, process.stderr]
    });

    cp.on('exit', code => process.exit(code));
};