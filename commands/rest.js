var Command = require('ronin').Command,
    BBRest = require('mosaic-rest-js'),
    Q = require('q'),
    jxon = require('jxon'),
    rest = require('../lib/rest'),
    fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    readFile = Q.denodeify(fs.readFile),
    readDir = Q.denodeify(fs.readdir),
    writeFile = Q.denodeify(fs.writeFile),
    ask = Q.denodeify(require('asking').ask),
    config = require('./config');

module.exports = Command.extend({
  desc: 'Backbase REST API CLI',

  options: {
    host: 'string',
    port: 'string',
    context: 'string',
    username: 'string',
    password: 'string',
    portal: 'string',
    command: 'string',
    "command-arg": 'string',
    method: {
        type: 'string',
        default: 'get'
    },
    "method-arg": 'string',
    dir: 'string',
    file: 'string'
  },

  run: function (host, port, context, username, password, portal, command, commandArg, method, methodArg, dir, file) {
    var bbrest = new BBRest();
    // TODO: find portal name from config.json
    bbrest.config = {
        host: host || bbrest.config.host,
        port: port || bbrest.config.port,
        context: context || bbrest.config.context,
        username: username || bbrest.config.username,
        password: password || bbrest.config.password,
        portal: portal || bbrest.config.portal
    };
    if (dir) {
        rest.submitDir(dir, bbrest, method);
    } else if (file) {
        rest.submitFile(file, bbrest, method);
    } else if (command) {
        var ca = command.split('-'),
            carg = (commandArg.charAt(0) === '[')? JSON.parse(commandArg) : [commandArg],
            p;
        console.log(carg);
        try {
            if (ca.lenght > 1) {
                p = bbrest[ca[0]]();
                p = bbrest[ca[1]].apply(bbrest, carg);
            } else {
                p = bbrest[ca[0]].apply(bbrest, carg);
            }
            p[method](methodArg)
            .then(rest.onResponse);
        } catch(e) {
            throw new Error(e);
        }
    } else {
        rest.submitDir('./', bbrest, method);
        // throw new Error('--command is not defined');
    }
  }
});