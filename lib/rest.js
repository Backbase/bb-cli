var Q = require('q');
var jxon = require('jxon');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var readFile = Q.denodeify(fs.readFile);
var readDir = Q.denodeify(fs.readdir);

module.exports.submitDir = function(dir, bbrest, method) {
    readDir(dir)
    .then(function(files) {
        var k = 0;
        files.sort();

        for (var i = 0; i < files.length; i++) {
            if (path.extname(files[i]) === '.xml') {
                submitFile(path.join(dir, files[i]), bbrest, method);
            }
        }
    })
    .fail(function(e) {
        console.log(chalk.red('lib/rest error: '), e);
    });
};

var sendXmlString = function(o) {
    return o.xml;
};

var submitFile = module.exports.submitFile = function(filePath, bbrest, method) {
    bbrest.config.plugin = sendXmlString;

    return readFile(filePath, 'utf-8')
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
        console.log(chalk.red('lib/rest error') + ' submiting file', e);
    });
};

var onResponse = module.exports.onResponse = function(r) {
    console.log(chalk.green(r.method) + " " + r.href);
    if (r.error) {
        if (r.statusCode >= 400) console.log(chalk.red('error'), jxon.stringToJs(r.body).message);
        else console.log(chalk.red('lib/rest error'), r.error);
    } else {
        console.log(chalk.yellow(r.statusCode) + " " + r.statusInfo);
    }
};