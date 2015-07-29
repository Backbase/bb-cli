var chalk = require('chalk');
var util = require('../lib/util');
var _ = require('lodash');
var config = require('../lib/config');
var path = require('path');
var Q = require('q');
var fs = require('fs-extra');
var readDir = Q.denodeify(fs.readdir);
var lstat = Q.denodeify(fs.lstat);
var readFile = Q.denodeify(fs.readFile);
var writeFile = Q.denodeify(fs.writeFile);
var remove = Q.denodeify(fs.remove);
var path = require('path');
var zipDir = require('../lib/zipDir');
var formattor = require('formattor');

var Command = require('ronin').Command;

var bbrest, jxon, cfg;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Zips and imports directory recursively.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -t,  --target <string>\t\t' + '\t\tDir to import.\n\n';
        r += '      -a,  --auto <boolean>\t\t' + '\t\tAuto generate model.xml when it is missing.\n\n';

        r += '      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.\n';
        r += '      -w,  --password <string>\t\t' + d('admin') + '\t\tPassword.\n';
        r += '      -p,  --portal <string>\t\t\t\tName of the portal on the server to target.\n';
        return r;
    },

    options: {
        target: {type: 'string', alias: 't', default: './'},
        auto: {type: 'boolean', alias: 'a'}
    },

    run: function () {

        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;

            return parseDir(path.resolve(cfg.target), exclude)
            .then(function(r) {
                var all = [];
                _.each(r.dirs, function(dirPath) {
                    all.push(parseDir(dirPath, exclude));
                });
                return Q.all(all)
                .then(function(rall) {
                    all = [];
                    _.each(rall, function(rv) {
                        if (!rv.model) {
                            if (cfg.auto) all.push(makeModelAndImport(rv.path, exclude));
                            else console.log(chalk.gray(path.parse(rv.path).base) + ' model.xml not found');
                        } else {
                            all.push(doImport(rv.path, exclude));
                        }
                    });
                    return Q.all(all)
                    .then(function(r) {
                        ok(r);
                    });
                });
            })
            .catch(function(err) {
                error(err);
            });

        });

    }
});

var exclude = ['.git', '.gitignore', 'bower_components', 'node_modules'];


function parseDir(dirPath, exclude) {
    return readDir(dirPath)
    .then(function(files) {
        return parseFiles(dirPath, files, exclude);
    });
}

// files - file path array
function parseFiles(dirPath, files, exclude) {
    var all = [];
    var filePath;
    _.each(files, function(fileName) {

        if (exclude.indexOf(path.parse(fileName).base) !== -1) return;
        filePath = path.join(dirPath, fileName);

        all.push(doLstat(filePath));
    });

    return Q.all(all)
    .then(function(rall) {
        var o = {
            path: dirPath,
            dirs: []
        };
        _.each(rall, function(v) {
            if (v) {
                if (v.dir) o.dirs.push(v.dir);
                if (v.model) o.model = v.model;
            }
        });
        return o;
    });

}

function doLstat(filePath) {
    var fileName = path.parse(filePath).base;
    return lstat(filePath)
    .then(function(stat) {
        if (stat.isFile()) {
            if (fileName === 'model.xml') return {model: filePath};
        } else if (stat.isDirectory()) {
            return {dir: filePath};
        }
        return;
    });
}

function doImport(dirPath, exclude) {
    return zipDir(dirPath, exclude)
    .then(function(zip) {
        return bbrest.importItem().file(zip.path).post()
        .then(function(r) {
            zip.clean();
            var body = jxon.stringToJs(_.unescape(r.body)).import;
            if (body.level === 'ERROR') {
                console.log(chalk.yellow(path.parse(dirPath).base) + ' ' + body.message);
            } else {
                console.log(chalk.green(path.parse(dirPath).base) + ' ' + body.message);
            }
        });
    });
}

function makeModelAndImport(dirPath, exclude) {
    return readFile(path.resolve(dirPath, 'bower.json'))
    .then(function(s) {
        var bjson = JSON.parse(s.toString());
        var jx = {
            catalog: {
                feature: {
                    name: bjson.name,
                    contextItemName: '[BBHOST]',
                    properties: {
                        property: [
                        {
                            $name: 'title',
                            $label: 'Title',
                            $viewHint: 'admin,designModeOnly',
                            value: {
                                $type: 'string',
                                _: _.startCase(bjson.name)
                            }
                        },
                        {
                            $name: 'version',
                            $label: 'Version',
                            $readonly: 'true',
                            $viewHint: 'designModeOnly',
                            value: {
                                $type: 'string',
                                _: bjson.version
                            }
                        },
                        {
                            $name: 'description',
                            $label: 'Description',
                            $readonly: 'true',
                            $viewHint: 'designModeOnly',
                            value: {
                                $type: 'string',
                                _: bjson.description
                            }
                        }]
                    }
                }
            }
        };
        jx = '<?xml version="1.0" encoding="UTF-8"?>' + jxon.jsToString(jx);
        jx = formattor(jx, {method: 'xml'});
        // console.log(chalk.red(bjson.name + ' xml: \n') + jx);
        var filePath = path.resolve(dirPath, 'model.xml');
        return writeFile(filePath, jx)
        .then(function() {
            return doImport(dirPath, exclude)
            .then(function() {
                remove(filePath);
            });
        });
    });
}


function error(err) {
    util.err(chalk.red('bb import-collection: ') + (err.message || err.error));
}
function ok(r) {
    util.ok('Importing ' + chalk.green(cfg.target) + '. Done.');
    return r;
}