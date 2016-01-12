var chalk = require('chalk');
var semver = require('semver');
var util = require('../lib/util');
var config = require('../lib/config');
var modelXml = require('../lib/modelXml');
var fs = require('fs-extra-promise');
var _ = require('lodash');
var jxon = require('jxon');
var chokidar = require('chokidar');
var path = require('path');
var Q = require('q');
var inquirer = require('inquirer');

var zipDir = require('../lib/zipDir');

var Command = require('ronin').Command;
var exclude = ['.git', '.gitignore', 'bower_components', 'node_modules', 'node', 'target'];

var bbrest, jxon, cfg, name;

module.exports = Command.extend({
    help: function() {
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

    options: {
        target: {type: 'string', alias: 't', default: './'},
        watch: {type: 'boolean', alias: 'W'},
        collection: {type: 'boolean', alias: 'l'},
        'init-import': {type: 'boolean', alias: 'i'},
        auto: {type: 'boolean', alias: 'a'},
        name: {type: 'string', alias: 'n'},
        version: {type: 'string', alias: 'v'},
        verbose: {type: 'boolean'},

        host: {type: 'string', alias: 'H'},
        port: {type: 'string', alias: 'P'},
        context: {type: 'string', alias: 'c'},
        username: {type: 'string', alias: 'u'},
        password: {type: 'string', alias: 'w'},
        portal: {type: 'string', alias: 'p'}
    },

    run: function () {

        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;

            if (cfg.collection) {
                if (cfg.watch) {
                    chokidar.watch(cfg.target, {
                        ignored: exclude,
                        followSymlinks: false
                    })
                    .on('ready', onWatchCollectionReady)
                    .on('all', onWatchCollection);
                }
            } else {

                if (cfg.watch) {
                    chokidar.watch(cfg.target, {
                        ignored: exclude,
                        followSymlinks: false
                    })
                    .on('ready', onWatchReady)
                    .on('all', onWatch);
                }

                return run(cfg.target);
            }
        })
        .catch(error);

    },

    runImport: function(target) {
        return config.getCommon()
            .then(function(r) {
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
    .then(function() {
        var replacements = {
            'model.xml': model.getXml()
        };
        output('Creating zip...');
        return zipDir(target, exclude, replacements)
        .then(function(zipPath) {
            return bbrest.importItem().file(zipPath).post()
            .then(function(r) {
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
    .catch(function(err) {
        error(err, model);
    });
}

function prepareModel(target, model) {
    output('Reading model.xml...');
    return model.read(path.resolve(target, 'model.xml'))
    .then(function() {
        if (!model.getProperty('version')) {
            if (cfg.version && semver.valid(cfg.version)) {
                model.addProperty('version', cfg.version);
            } else {
                return getBowerJson(target)
                .then(function(bjson) {
                    if (bjson.version) model.addProperty('version', bjson.version);
                    else return addZeroVersion(model);
                })
                .catch(function() {
                    return addZeroVersion(model);
                });
            }
        }
    })
    .catch(function(err) {
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
                }], function(prm) {
                    if (prm.saveModel) defer.resolve();
                    else defer.reject(new Error('Can not import item without model.xml'));
                });
            }

            return defer.promise
            .then(function() { // --auto options is on
                output('Creating model.xml for feature...');
                if (cfg.name) {
                    model.createFeature(cfg.name);
                    if (cfg.version) {
                        model.addProperty('version', cfg.version);
                        return;
                    }
                }

                return getBowerJson(target)
                .then(function(bjson) {
                    if (!cfg.name) model.createFeature(bjson.name);
                    if (cfg.version) model.addProperty('version', cfg.version);
                    else if (bjson.version) model.addProperty('version', bjson.version);
                    else return addZeroVersion(model);
                });
            })
            .catch(function(err) {
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
    .then(function(bjson) {
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
    util.err(chalk.red((model.getName() || '')) + ' ' + (err.message || err.error));
}
function ok(r, name) {
    util.ok(chalk.yellow(name) + ' imported');
    return r;
}

function onWatchReady() {
    console.log(arguments);
}
function onWatch(evName, fpath) {
    output(chalk.gray(fpath) + ' ' + evName + '...');
    run(cfg.target);
}
var dirs = {};
function onWatchCollectionReady() {
    console.log('Watching collection...');
    fs.readdirAsync(cfg.target)
    .then(function(files) {
        _.each(files, function(name) {
            var fullPath = path.join(cfg.target, name);
            fs.isDirectoryAsync(fullPath)
                .then(function() {
                    dirs[fullPath] = path.resolve(fullPath);
                    if (cfg['init-import']) run(dirs[fullPath]);
                });
        });
    });
}
function onWatchCollection(evName, fpath) {
    _.each(dirs, function(fullPath, dir) {
        if (fpath.indexOf(dir + '/') === 0) {
            run(fullPath);
            return false;
        }
    });
}
