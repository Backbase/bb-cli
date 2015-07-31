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
var orderDeps = require('../lib/orderDependencies');

var Command = require('ronin').Command;

var queue = [];
var currentlyImporting = '';
var exclude = ['.git', '.gitignore', 'bower_components', 'node_modules'];

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

            // return parseDir(path.resolve(cfg.target), exclude)
            // return orderDeps(path.resolve(cfg.target, '../../'))
            return getBowers(path.resolve(cfg.target), exclude)
            .then(function(r) {
                var all = [];
                console.log('reading bower components...');
                _.each(r.dirs, function(dir, i) {
                    if (dir.name.indexOf('collection-') === 0) return;
                    queue.push({name: dir.name});
                    // if (path.parse(dirPath).base !== bjson.name) console.log(path.parse(dirPath).base, bjson.name);
                    all.push(parseDir(dir.path, exclude));
                });
                return Q.all(all)
                .then(function(rall) {
                    console.log('creating zips...');
                    all = [];
                    _.each(rall, function(rv) {
                        if (!rv) return;
                        if (!rv.model) {
                            var json = _.where(r.dirs, {name: rv.name})[0].json;
                            if (!json) console.log(rv);
                            if (cfg.auto) all.push(makeModelAndZip(rv.path, json, exclude));
                            else console.log(chalk.gray(path.parse(rv.path).base) + ' model.xml not found');
                        } else {
                            all.push(zipPackage(rv.path, exclude));
                        }
                    });
                    return Q.all(all)
                    .then(function() {
                        console.log('importing...');
                        return importQueue()
                        .then(function(r) {
                            ok(r);
                        });
                    });
                });
            })
            .catch(function(err) {
                error(err);
            });

        });

    }
});



function parseDir(dirPath, exclude) {
    return readDir(dirPath)
    .then(function(files) {
        return parseFiles(dirPath, files, exclude);
    })
    .catch(function() {
        var name = path.parse(dirPath).base;
        console.log(chalk.yellow(name) + ' problem parsing dir');
    });
}

// files - file path array
function parseFiles(dirPath, files, exclude) {
    var all = [];
    var filePath;
    var o = {
        path: dirPath,
        name: path.parse(dirPath).base,
        dirs: []
    };
    _.each(files, function(fileName) {

        if (exclude.indexOf(path.parse(fileName).base) !== -1) return;
        filePath = path.join(dirPath, fileName);

        all.push(doLstat(filePath));
    });

    return Q.all(all)
    .then(function(rall) {
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
            return {dir: {
                path: filePath,
                name: fileName
            }};
        }
        return;
    });
}

function zipPackage(dirPath, exclude) {
    return zipDir(dirPath, exclude)
    .then(function(zip) {
        zip.dirName = path.parse(dirPath).base;
        var item = _.where(queue, {name: zip.dirName})[0];
        item.zip = zip;
    });
}

function importQueue() {
    var qu = queue.shift();
    if (!qu.zip && queue.length) return importQueue();
    currentlyImporting = qu.zip.dirName;
    return bbrest.importItem().file(qu.zip.path).post()
    .then(function(r) {
        qu.zip.clean();
        var body = jxon.stringToJs(_.unescape(r.body)).import;
        if (body.level === 'ERROR') {
            console.log(chalk.yellow(qu.zip.dirName) + ' ' + body.message);
        } else {
            console.log(chalk.green(qu.zip.dirName) + ' ' + body.message);
        }
        if (queue.length) return importQueue();
    });
}

function readBowerJson(dir) {
    return readFile(path.resolve(dir.path, 'bower.json'))
    .then(function(s) {
        var bjson = JSON.parse(s.toString());
        dir.json = bjson;
    })

}

function getBowers(mainPath, exclude) {
    return parseDir(mainPath, exclude)
    .then(function(r) {
        var all = [];
        _.each(r.dirs, function(dir) {
            all.push(readBowerJson(dir));
        });
        return Q.all(all)
        .then(function() {
            var flat = {};
            _.each(r.dirs, function(dir) {
                if (!dir.json || !dir.json.dependencies) return;
                // if (dir.json.dependencies['module-transactions-2']) delete dir.json.dependencies['module-transactions-2'];
                flat[dir.name] = dir.json.dependencies;
                flat[dir.name] = _.keys(flat[dir.name]);
            });
            _.each(flat, function(deps, depName) {
                var alldeps = [];
                _.each(deps, function(key) {
                    alldeps = _.union(alldeps, flat[key]);
                });
                flat[depName] = _.union(deps, alldeps);
            });
            var order = orderDeps(flat);
            var newDirs = [];
            _.each(order, function(dep) {
                newDirs.push(_.where(r.dirs, {name: dep})[0]);
            });
            r.dirs = newDirs;
            return r;
        });
    });

}

function makeModelAndZip(dirPath, bjson, exclude) {
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
                            _: bjson.description || ''
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
        return zipPackage(dirPath, exclude)
        .then(function() {
            remove(filePath);
        });
    })
    .catch(function(err) {
        error('make model.xml problem');
        throw err;
    });
}


function error(err) {
    util.err(chalk.red((currentlyImporting || 'bb import-collection') + ': ') + (err.message || err.error));
}
function ok(r) {
    util.ok('Importing ' + chalk.green(cfg.target) + '. Done.');
    return r;
}
