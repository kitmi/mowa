const path = require('path');
const nodemiral = require( 'nodemiral');
const {runTaskList} = require( '../../cli-util');


/**
 * @module MowaCLI_Docker
 * @summary Docker module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to setup and manage remote docker env.';

exports.commandsDesc = {
  'init': 'Run this command in a empty folder to initiate a new mowa project.',
  'createApp': 'Run this command to create a new app in a mowa project.'
};

exports.help = function (api) {
  api.log('verbose', 'exec => mup docker help');
};

exports.setup = function (api) {
  log('exec => mup docker setup');
  const list = nodemiral.taskList('Setup Docker');

  list.executeScript('setup docker', {
    script: path.resolve(__dirname, 'assets/docker-setup.sh')
  });

  const sessions = api.getSessions([ 'meteor', 'mongo', 'proxy' ]);
  const rsessions = sessions.reduce((prev, curr) => {
    if (prev.map(session => session._host).indexOf(curr._host) === -1) {
      prev.push(curr);
    }
    return prev;
  }, []);

  return runTaskList(list, rsessions);
};