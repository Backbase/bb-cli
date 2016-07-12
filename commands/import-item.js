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
        r += '\n\t Zips and imports item.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -t,  --target <string>\t\t' + '\t\tDir to import.\n';
        r += '      -W,  --watch <boolean>\t\t' + '\t\tWatch for file changes in the current dir and autosubmit.\n';
        r += '      -l,  --collection <boolean>\t' + '\t\tWatch collection directory tree for changes.\n';
        r += '      -i,  --init-import <boolean>\t' + '\t\tImport whole collection on init.\n';
        r += '      -a,  --auto <boolean>\t\t' + '\t\tAuto create model.xml if doesn\'t exist.\n';
        r += '      -n,  --name <boolean>\t\t' + '\t\tName of the feature to auto create before reading bower.json\n';
        r += '      -v,  --version <boolean>\t\t' + '\t\tVersion of the feature to auto create before reading bower.json\n';
        r += '           --verbose <boolean>\t\t' + '\t\tEnables detailed output.\n\n';

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
        watch: {type: 'boolean', alias: 'W'},
        collection: {type: 'boolean', alias: 'l'},
        'init-import': {type: 'boolean', alias: 'i'},
        auto: {type: 'boolean', alias: 'a'},
        name: {type: 'string', alias: 'n'},
        version: {type: 'string', alias: 'v'},
        verbose: {type: 'boolean'},
        portal: {type: 'string', alias: 'p'}
    }),

    run: function () {
        return config.getCommon(this.options)
            .then(function (r) {
                bbrest = r.bbrest;
                jxon = r.jxon;
                cfg = r.config.cli;

                if (cfg.watch) {
                    watch.watchTree(cfg.target, {
                        ignoreDotFiles: true,
                        ignoreUnreadableDir: true,
                        ignoreNotPermitted: true,
                        filter: function (fileName) {
                            var v = exclude.indexOf(fileName);
                            return (v === -1);
                        }
                    }, cfg.collection ? onWatchCollection : onWatch);

                    if (!cfg.collection && cfg['init-import']) run(cfg.target);
                } else if (cfg.collection) {
                    fs.readdir(cfg.target, function (err, files) {
                        if (err) {
                            throw err;
                        }

                        files.map(function (file) {
                            return path.join(cfg.target, file);
                        }).filter(function (file) {
                            return fs.statSync(file).isDirectory();
                        }).forEach(function (file) {
                            run(file);
                        });
                    });
                } else {
                    return run(cfg.target);
                }
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

function run(target) {
    var model = modelXml(jxon);
    return prepareModel(target, model)
        .then(function () {
            var replacements = {
                'model.xml': model.getXml()
            };
            output('Creating zip...');
            return zipDir(target, exclude, replacements)
                .then(function (zipPath) {
                    return bbrest.importItem().file(zipPath).post()
                        .then(function (r) {
                            output(r);
                            if (r.error) {
                                throw new Error('Rest API Error: ' + r.statusInfo);
                            }
                            var body = jxon.stringToJs(_.unescape(r.body)).import;
                            if (body.level === 'ERROR') throw new Error(body.message);
                            name = model.getName() + ' v' + model.getProperty('version');
                            ok(r, name);
                        });
                });
        })
        .catch(function (err) {
            error(err, model);
        });
}

function prepareModel(target, model) {
    output('Reading model.xml...');
    return model.read(path.resolve(target, 'model.xml'))
        .then(function () {
            if (!model.getProperty('version')) {
                if (cfg.version && semver.valid(cfg.version)) {
                    model.addProperty('version', cfg.version);
                } else {
                    return getBowerJson(target)
                        .then(function (bjson) {
                            if (bjson.version) model.addProperty('version', bjson.version);
                            else return addZeroVersion(model);
                        })
                        .catch(function () {
                            return addZeroVersion(model);
                        });
                }
            }
        })
        .catch(function (err) {
            if (err.code === 'ENOENT') {
                var defer = Q.defer();
                //console.log(chalk.gray('model.xml') + ' is not found.');

                if (cfg.auto || cfg['init-import']) {
                    defer.resolve();
                } else {
                    inquirer.prompt([{
                        message: 'model.xml is not found. Auto submit one?',
                        name: 'saveModel',
                        type: 'confirm'
                    }], function (prm) {
                        if (prm.saveModel) defer.resolve();
                        else defer.reject(new Error('Can not import item without model.xml'));
                    });
                }

                return defer.promise
                    .then(function () { // --auto options is on
                        output('Creating model.xml for feature...');
                        if (cfg.name) {
                            model.createFeature(cfg.name);
                            if (cfg.version) {
                                model.addProperty('version', cfg.version);
                                return;
                            }
                        }

                        return getBowerJson(target)
                            .then(function (bjson) {
                                if (!cfg.name) model.createFeature(bjson.name);
                                if (cfg.version) model.addProperty('version', cfg.version);
                                else if (bjson.version) model.addProperty('version', bjson.version);
                                else return addZeroVersion(model);
                            });
                    })
                    .catch(function (err) {
                        console.log('Can not auto create model.xml');
                        throw err;
                    });
            }
            throw err;
        });
}

function getBowerJson(target) {
    output('Reading bower.json...');
    return fs.readFileAsync(path.resolve(target, 'bower.json'))
        .then(function (bjson) {
            try {
                bjson = JSON.parse(bjson.toString());
            } catch (err) {
                throw new Error('Error while parsing bower.json');
            }
            return bjson;
        });
}

function addZeroVersion(model) {
    model.addProperty('version', '0.0.0-alpha.0');
    output('Version can not be resolved. Setting version to ' + model.getProperty('version'));
}

function output() {
    if (cfg.verbose) console.log.apply(this, arguments);
}

function error(err, model) {
    var errMessage = err.message || err.error;
    if (model && model.getName()) {
        errMessage = chalk.red(model.getName()) + errMessage;
    }

    util.err(errMessage);
}

function ok(r, name) {
    util.ok(chalk.yellow(name) + ' imported');
    return r;
}

function onWatch(fileName, curStat, prevStat) {
    if (typeof f === 'object' && prevStat === null && curStat === null) {
        console.log(chalk.cyan('Watching...'));
        // Finished walking the tree
        // file is object where key is fileName and value is stat
    } else {
        if (prevStat === null) {
            if (typeof fileName !== 'string') return;
            // f is a new file
            output(chalk.gray(fileName) + ' created.');
            run(cfg.target);
        } else if (curStat.nlink === 0) {
            // f was removed
            output(chalk.gray(fileName) + ' removed.');
            run(cfg.target);
        } else {
            output(chalk.gray(fileName) + ' changed.');
            run(cfg.target);
            // f was changed
        }
    }
}
var dirs = {};
function onWatchCollection(f, curStat, prevStat) {
    var p;

    if (typeof f === 'object' && prevStat === null && curStat === null) {
        console.log(chalk.green('Scanning underlying directories for items...'));

        _.each(f, function (v, k) {
            p = path.dirname(k).split(path.sep)[0];
            if (p === '.') return;
            dirs[p] = path.resolve(p);
        });

        var numberOfDirectories = 0;
        var remoteHost = bbrest.config;
        _.each(dirs, function (value, key) {
            console.log(chalk.cyan('Adding watch for ') + chalk.yellow(key));
            numberOfDirectories++;
            if (cfg['init-import']) run(value);
        });

        console.log(chalk.cyan('Finished setting up ' + numberOfDirectories + ' watches.'));
        console.log(chalk.cyan('Endpoint: ') + remoteHost.scheme + '://' + remoteHost.host + ':' + remoteHost.port + '/' + remoteHost.context);
        if (cfg['init-import']) console.log('Importing all items...');
        // Finished walking the tree
        // file is object where key is fileName and value is stat
    } else {
        p = path.dirname(f).split(path.sep)[0];

        if (prevStat === null) {
            if (typeof f !== 'string') return;
            // f is a new file
            output(chalk.gray(f) + ' created.');
            run(dirs[p]);
        } else if (curStat.nlink === 0) {
            // f was removed
            output(chalk.gray(f) + ' removed.');
            run(dirs[p]);
        } else {
            output(chalk.gray(f) + ' changed.');
            run(dirs[p]);
            // f was changed
        }
    }
}
