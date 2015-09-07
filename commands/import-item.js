var chalk = require('chalk');
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
var exclude = ['.git', '.gitignore', 'bower_components', 'node_modules'];

var bbrest, jxon, cfg, model, name;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Zips and imports item.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -t,  --target <string>\t\t' + '\t\tDir to import.\n';
        r += '      -w,  --watch <boolean>\t\t' + '\t\tWatch for file changes in the current dir and autosubmit.\n';
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
        watch: {type: 'boolean', alias: 'w'},
        auto: {type: 'boolean', alias: 'a'},
        name: {type: 'string', alias: 'n'},
        version: {type: 'string', alias: 'v'},
        verbose: {type: 'boolean'}
    },

    run: function () {

        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;
            model = modelXml(jxon);

            if (cfg.watch) {
                watch.watchTree(cfg.target, {
                    ignoreDotFiles: true,
                    ignoreUnreadableDir: true,
                    ignoreNotPermitted: true,
                    filter: function(fileName) {
                        var v = exclude.indexOf(fileName);
                        return (v === -1);
                    }
                }, onWatch);
                output(chalk.cyan('Watching...'));
            }

            return run();
        });

    }
});

function run() {
    return prepareModel()
    .then(function() {
        name = model.getName() + ' v' + model.getProperty('version');
        // console.log(model.getXml());
        // return;
        var replacements = {
            'model.xml': model.getXml()
        };
        output('Creating zip...');
        return zipDir(cfg.target, exclude, replacements)
        .then(function(zip) {
            return bbrest.importItem().file(zip.path).post()
            .then(function(r) {
                output(r);
                if (r.error) {
                    throw new Error('Rest API Error: ' + r.statusInfo);
                }
                var body = jxon.stringToJs(_.unescape(r.body)).import;
                if (body.level === 'ERROR') throw new Error(body.message);
                zip.clean();
                ok(r);
            });
        });
    })
    .catch(function(err) {
        error(err);
    });
}

function prepareModel() {
    output('Reading model.xml...');
    return model.read(path.resolve(cfg.target, 'model.xml'))
    .then(function() {
        if (!model.getProperty('version')) {
            if (cfg.version) {
                model.addProperty('version', cfg.version);
            } else {
                return getBowerJson()
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
            console.log(chalk.gray('model.xml') + ' is not found.');

            if (cfg.auto) {
                defer.resolve();
            } else {
                inquirer.prompt([{
                    message: 'Auto submit one?',
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

                return getBowerJson()
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

function getBowerJson() {
    output('Reading bower.json...');
    return fs.readFileAsync(path.resolve(cfg.target, 'bower.json'))
    .then(function(bjson) {
        try {
            bjson = JSON.parse(bjson.toString());
        } catch(err) {
            throw new Error('Error while parsing bower.json');
        }
        return bjson;
    });
}

function onWatch(fileName, curStat, prevStat) {
    // if (typeof f === 'object' && prevStat === null && curStat === null) {
    //     // Finished walking the tree
    //     // file is object where key is fileName and value is stat
    // } else
    if (prevStat === null) {
        if (typeof fileName !== 'string') return;
        // f is a new file
        output(chalk.gray(fileName) + ' created.');
        run();
    } else if (curStat.nlink === 0) {
        // f was removed
        output(chalk.gray(fileName) + ' removed.');
        run();
    } else {
        output(chalk.gray(fileName) + ' changed.');
        run();
        // f was changed
    }
}

function addZeroVersion(model) {
    model.addProperty('version', '0.0.0-alpha.0');
    output('Version can not be resolved. Setting version to ' + model.getProperty('version'));
}

function output() {
    if (cfg.verbose) console.log.apply(this, arguments);
}
function error(err) {
    util.err(chalk.red('bb import-item: ') + (err.message || err.error));
}
function ok(r) {
    util.ok(chalk.yellow(name) + ' imported from ' + chalk.green(cfg.target));
    return r;
}
