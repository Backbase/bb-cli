var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var modelXml = require('../lib/modelXml');
var fs = require('fs-extra-promise');
var _ = require('lodash');
var jxon = require('jxon');
var watch = require('watch');
var path = require('path');

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
        r += '      -w,  --watch <boolean>\t\t' + '\t\tWatch for file changes in the current dir and autosubmit.\n\n';
        r += '      -a,  --auto <boolean>\t\t' + '\t\tAuto create model.xml if doesn\'t exist.\n\n';

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
        watch: {type: 'boolean', alias: 'w'}
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
                console.log(chalk.cyan('Watching...'));
            }

            return run();
        });

    }
});

function run() {
    return prepareModel()
    .then(function() {
        name = model.getName() + ' v' + model.getProperty('version');
        var replacements = {
            'model.xml': model.getXml()
        };
        console.log('Creating zip...');
        return zipDir(cfg.target, exclude, replacements)
        .then(function(zip) {
            return bbrest.importItem().file(zip.path).post()
            .then(function(r) {
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
    console.log('Reading model.xml...');
    return model.read(path.resolve(cfg.target, 'model.xml'))
    .then(getVersionFromBower)
    .catch(function(err) {
        if (err.code === 'ENOENT' && cfg.auto) {
            model.createFeature();
            return getVersionFromBower();
        }
        throw err;
    });
}

function getVersionFromBower() {
    console.log('Reading bower.json...');
    return fs.readFileAsync(path.resolve(cfg.target, 'bower.json'))
    .then(function(bjson) {
        bjson = JSON.parse(bjson.toString());
        if (bjson.version) model.addProperty('version', bjson.version);
    });
}

function onWatch(fileName, curStat, prevStat) {
    // if (typeof f === 'object' && prevStat === null && curStat === null) {
    //     // Finished walking the tree
    //     // file is object where key is fileName and value is stat
    // } else
    if (prevStat === null) {
        // f is a new file
        console.log(chalk.gray(fileName) + ' created.');
        run();
    } else if (curStat.nlink === 0) {
        // f was removed
        console.log(chalk.gray(fileName) + ' removed.');
        run();
    } else {
        console.log(chalk.gray(fileName) + ' changed.');
        run();
        // f was changed
    }
}

function error(err) {
    util.err(chalk.red('bb import-item: ') + (err.message || err.error));
}
function ok(r) {
    util.ok('Importing ' + chalk.yellow(name) + ' from ' + chalk.green(cfg.target) + '. Done.');
    return r;
}
