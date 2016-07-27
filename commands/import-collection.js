var chalk = require('chalk');
var semver = require('semver');
var util = require('../lib/util');
var _ = require('lodash');
var config = require('../lib/config');
var path = require('path');
var Q = require('q');
var zipDir = require('../lib/zipDir');
var parseCollection = require('../lib/parseCollection');

var Command = require('ronin').Command;

var currentlyImporting = '';
var exclude = ['.git', '.gitignore', 'bower_components', 'node_modules', 'node', 'target'];

var bbrest, jxon, cfg;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Zips and imports directory recursively.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -t,  --target <string>\t\t' + '\t\tDir where bower.json is.\n\n';
        r += '      -s,  --skip <boolean>\t\t' + '\t\tDon`t generate model.xml when it is missing.\n\n';
        // r += '      -r,  --remove <boolean>\t\t' + '\t\tRemoves components in target instead of adding them.\n\n';

        r += '      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.\n';
        r += '      -w,  --password <string>\t\t' + d('admin') + '\t\tPassword.\n';
        r += '      -p,  --portal <string>\t\t\t\tName of the portal on the server to target.\n';
        return r;
    },

    options: util.buildOpts({
        target: {type: 'string', alias: 't', default: './'},
        auto: {type: 'boolean', alias: 'a'},
        remove: {type: 'boolean', alias: 'r'},
        portal: {type: 'string', alias: 'p'}
    }),

    run: function () {

        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;

            console.log('Parsing collection...');
            return parseCollection(cfg.target, exclude, cfg.auto, r.jxon)
            .then(createAllZips)
            .then(importAll)
            .then(ok);
        })
        .catch(function(err) {
            if (err.error) {
                error(new Error(err.statusInfo));
            } else if (err.code === 'ENOENT') {
                error(new Error('Can not open file ' + chalk.yellow(err.path.substr(path.resolve(cfg.target).length))));
            } else {
                error(err);
            }
        });

    }
});

// result:
// path - path of the bower_component dir
// name - name of the dir
// model - instance of ModelXml
function createAllZips(result) {
    console.log('Creating zips...');
    var all = [];
    var replacements;
    _.each(result, function(comp) {
        if (!comp.model.isEmpty()) {
            if (comp.version && semver.valid(comp.version)) {
                comp.model.addProperty('version', comp.version);
            }
            replacements = {
                'model.xml': comp.model.getXml()
            };
            all.push(zipDir(comp.path, exclude, replacements)
            .then(function(zipPath) {
                comp.zipPath = zipPath;
                return comp;
            }));
        }
    });
    return Q.all(all)
        .then(function(dirs) {
            console.log('Start Importing...');
            return(dirs);
        });
}

function importAll(dirs) {
    var comp = dirs.shift();
    if (!comp.zipPath && dirs.length) return importAll(dirs);
    currentlyImporting = comp.name;

    return bbrest.importItem().file(comp.zipPath).post()
    .then(function(r) {
        console.log(chalk.green(comp.name) + ' ' + r.import.message);
        if (dirs.length) return importAll(dirs);
    });
}

function error(err) {
    if (err.statusInfo === 'Error: connect ECONNREFUSED') {
        currentlyImporting = '';
        err.message = 'Check if CXP portal is running';
    }
    util.err(chalk.red((currentlyImporting || 'bb import-collection') + ': ') + (err.message || err.error));
}
function ok(r) {
    util.ok('Importing ' + chalk.green(cfg.target) + '. Done.');
    return r;
}
