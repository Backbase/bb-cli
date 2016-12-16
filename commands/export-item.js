var chalk = require('chalk');
var semver = require('semver');
var util = require('../lib/util');
var config = require('../lib/config');
var modelXml = require('../lib/modelXml');
var fs = require('fs-extra-promise');
var _ = require('lodash');
var jxon = require('jxon');
var watch = require('watch');
var path = require('path');
var Q = require('q');
var inquirer = require('inquirer');

var zipDir = require('../lib/zipDir');

var Command = require('ronin').Command;
var exclude = ['.git', '.gitignore', 'bower_components', 'node_modules', 'node', 'target'];

var bbrest, jxon, cfg, name;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Exports the package from the Backbase server.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -t,  --target <string>\t\t' + '\t\tItem to export.\n';
        r += '      -s,  --save <string>\t\t' + '\t\tFile to save.\n';
        r += '           --verbose <boolean>\t\t' + '\t\tEnables detailed output.\n\n';

        r += '      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.\n';
        r += '      -w,  --password <string>\t\t' + d('admin') + '\t\tPassword.\n';
        r += '      -p,  --portal <string>\t\t\t\tName of the portal on the server to target.\n';
        r += '      -A,  --auth-path <string>\t\t\t\tAuthorization path.\n';
        return r;
    },

    options: util.buildOpts({
        save: {type: 'string', alias: 's'},
        target: {type: 'string', alias: 't'},
        verbose: {type: 'boolean'}
    }),

    run: function () {
        return config.getCommon(this.options)
            .then(function (r) {
                bbrest = r.bbrest;
                jxon = r.jxon;
                cfg = r.config.cli;

                if (!cfg.target) throw Error('Target item is not defined. Use --target option');

                var file = cfg.save || cfg.target + '.zip';
                return bbrest.exportItem(cfg.target).file(file).get()
                  .then(function(r) { ok(r, cfg.target, file); })
            })
            .catch(error);

    },

    runImport: function (target) {
        return config.getCommon()
            .then(function (r) {
                bbrest = r.bbrest;
                jxon = r.jxon;
                cfg = {};
                run(target);
            });
    }
});

function error(err) {
    var errMessage = err.message || err.error;

    util.err(errMessage);
    process.exit(1);
}

function ok(r, name, file) {
    util.ok(chalk.yellow(name) + ' exported as ' + chalk.green(file));
    return r;
}


