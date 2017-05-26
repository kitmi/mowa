const fs = require('fs');
const _ = require('lodash');
const {Client} = require('ssh2');
const path = require('path');

const spawn = require('child_process').spawn;

exports.restart = function (env) {
    let cp = spawn(process.argv[0], process.argv.slice(1), {
        env: Object.assign({}, process.env, { NODE_ENV: env }),
        stdio: [process.stdin, process.stdout, process.stderr]
    });

    cp.on('exit', code => process.exit(code));
};

exports.runTaskList = function (list, sessions, opts) {
  return new Promise((resolve, reject) => {
    list.run(sessions, opts, summaryMap => {
      for (var host in summaryMap) {
        const summary = summaryMap[host];
        if (summary.error) {
          reject(summary.error);
          return;
        }
      }

      resolve();
    });
  });
};

// Maybe we should create a new npm package
// for this one. Something like 'sshelljs'.
exports.runSSHCommand = function (info, command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    // TODO better if we can extract SSH agent info from original session
    var sshAgent = process.env.SSH_AUTH_SOCK;
    var ssh = {
      host: info.host,
      port: (info.opts && info.opts.port || 22),
      username: info.username
    };

    if (info.pem) {
      ssh.privateKey = fs.readFileSync(path.resolve(info.pem), 'utf8');
    } else if (info.password) {
      ssh.password = info.password;
    } else if (sshAgent && fs.existsSync(sshAgent)) {
      ssh.agent = sshAgent;
    }
    conn.connect(ssh);

    conn.once('error', function (err) {
      if (err) {
        reject(err);
      }
    });

    // TODO handle error events
    conn.once('ready', function () {
      conn.exec(command, function (err, stream) {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        let output = '';

        stream.on('data', function (data) {
          output += data;
        });

        stream.once('close', function (code) {
          conn.end();
          resolve({code, output});
        });
      });
    });
  });
};

exports.countOccurences = function (needle, haystack) {
  const regex = new RegExp(needle, 'g');
  const match = haystack.match(regex) || [];
  return match.length;
};