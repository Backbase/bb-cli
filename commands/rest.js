var Command = require('ronin').Command,
    BBRest = require('mosaic-rest-js'),
    Q = require('q'),
    jxon = require('jxon'),
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
    }
    if (dir) {
        submitDir(dir, bbrest, method);
    } else if (file) {
        submitFile(file, bbrest, method);
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
            .then(onResponse);
        } catch(e) {
            throw new Error(e);
        }
    } else {
        submitDir('./', bbrest, method);
        // throw new Error('--command is not defined');
    }
  }
});

function submitDir(dir, bbrest, method) {
    readDir(dir)
    .then(function(files) {
        var r = Q(false), k = 0;
        files.sort();
        for (var i = 0; i < files.length; i++) {
            if (path.extname(files[i]) !== '.xml') continue;
            r = r.then(function() {
                return submitFile(dir + files[k++], bbrest, method);
            });
        }
    })
    .fail(function(e) {
        console.log(chalk.red('error'), e);
    });
}
function submitFile(file, bbrest, method) {
    bbrest.config.plugin = sendXmlString;
    return readFile(file)
    .then(function(s) {
        var xmlString = s.toString(),
            command = jxon.stringToXml(xmlString).documentElement.nodeName,
            plural = command.substr(-1) === 's';
        if (plural) command = command.substr(0, command.length - 1);
        // change default
        if (method === 'get') {
            if (plural) {
                method = 'put'
            } else {
                method = 'post';
            }
        }
        return bbrest[command]()[method]({xml: xmlString})
        .then(onResponse);
    })
    .fail(function(e) {
        console.log(chalk.red('error') + ' submiting file', e);
    });
}
function onResponse(r) {
    console.log(chalk.green(r.method) + " " + r.href);
    if (r.error) {
        if (r.statusCode >= 400) console.log(chalk.red('error'), jxon.stringToJs(r.body).message);
        else console.log(chalk.red('error'), r.error);
    } else {
        console.log(chalk.yellow(r.statusCode) + " " + r.statusInfo);
    }
}
function sendXmlString(o) {
    return o.xml;
}
