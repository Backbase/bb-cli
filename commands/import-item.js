var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var clui = require('clui');
var _ = require('lodash');
var loading = new clui.Spinner('Please wait...');
var jxon = require('jxon');
var Q = require('q');
var fs = require('fs-extra');
var remove = Q.denodeify(fs.remove);

var zipDir = require('../lib/zipDir');

var Command = require('ronin').Command;

var bbrest, jxon, cfg;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Zips and imports item.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -t,  --target <string>\t\t' + '\t\tDir to import.\n\n';

        r += '      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.\n';
        r += '      -w,  --password <string>\t\t' + d('admin') + '\t\tPassword.\n';
        r += '      -p,  --portal <string>\t\t\t\tName of the portal on the server to target.\n';
        return r;
    },

    options: {
        target: {type: 'string', alias: 't', default: './'}
    },

    run: function () {

        loading.start();
        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;

            var cwd = process.cwd();
            process.chdir(cfg.target);

            return zipDir('./', exclude)
            .then(function(zip) {
                return bbrest.importItem().file(zip.path).post()
                .then(function(r) {
                    var body =  jxon.stringToJs(_.unescape(r.body)).import;
                    if (body.level === 'ERROR') throw new Error(body.message);
                    return remove(zip.path)
                    .then(function() {
                        zip.clean();
                        process.chdir(cwd);
                        ok(r);
                    });
                })
                .catch(function(err) {
                    error(err);
                });
            });
        });

    }
});

var exclude = ['.git', '.gitignore', 'bower_components', 'node_modules'];

function error(err) {
    loading.stop();
    util.err(chalk.red('bb import-item: ') + (err.message || err.error));
}
function ok(r) {
    loading.stop();
    util.ok('Importing ' + chalk.green(cfg.target) + '. Done.');
    return r;
}
