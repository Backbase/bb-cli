var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var formattor = require('formattor');
var clui = require('clui');
var _ = require('lodash');
var loading = new clui.Spinner('Please wait...');
var Q = require('q');
var fs = require('fs-extra');
var readFile = Q.denodeify(fs.readFile);
var writeFile = Q.denodeify(fs.writeFile);
var remove = Q.denodeify(fs.remove);
var move = Q.denodeify(fs.move);
var mkdirp = Q.denodeify(fs.mkdirp);
var path = require('path');
var extract = require('extract-zip');
var inquirer = require("inquirer");

var Command = require('ronin').Command;

var bbrest, jxon, cfg;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Exports portal.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description';
        r += '\n\t  All `bb rest` options for configuring portal, context, username etc are valid.\n\n';
        r += '      -s,  --save <string>\t\t' + '\t\tFile to save the export to.\n';
        r += '      -t,  --type <string>\t\t' + d('model') + '\t\tWhat to export: model(portal without content), portal, widget, container\n';
        r += '      -n,  --name <string>\t\t\t\tName of the widget or container to export.\n';
        r += '      -C,  --item-context <string>\t\t\tContext of the widget or container that is to be exported.\n';
        r += '           --pretty <boolean>\t\t' + d('true') + '\t\tPrettify the output.\n';
        r += '      -k,  --chunk <boolean>\t\t' + d('false') + '\t\tParse output and chunk it into multiple files.\n\n';

        r += '      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.\n';
        r += '      -w,  --password <string>\t\t' + d('admin') + '\t\tPassword.\n';
        r += '      -p,  --portal <string>\t\t\t\tName of the portal on the server to target.\n';
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb export \t\t\t\t\t\t\t\tOutputs prettified, sorted xml file.\n';
        r += '      bb export --save myPortal.xml\t\t\t\t\t\tSaves prettified, sorted export to myPortal.xml\n';
        r += '      bb export --portal my-portal --save myPortal.xml -k\t\t\tSaves export to myPortal.xml and chunks to ./myPortal dir\n';
        r += '      bb export --type portal --save retail.zip\t\t\t\t\tSaves export including content to retail.zip\n';
        r += '      bb export --type portal --portal retail-banking --save retail.zip -k\tSaves export including content to retail.zip and chunks into ./retail dir\n';
        return r;
    },

    options: {
        save: {type: 'string', alias: 's'},
        type: {type: 'string', alias: 't', default: 'model'},
        name: {type: 'string', alias: 'n'},
        'item-context': {type: 'string', alias: 'C'},
        pretty: {type: 'boolean', default: true},
        chunk: {type: 'boolean', alias: 'k', default: false}
    },

    run: function () {

        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;

            return getPortal()
            .then(function(portal) {
                bbrest.config.portal = portal;

                var action = 'post';
                var jx;

                switch (cfg.type) {
                    case 'portal':
                        jx = {exportRequest: {portalExportRequest: {
                            portalName: bbrest.config.portal,
                            includeContent: true,
                            includeGroups: true
                        }}};
                        break;
                    case 'widget':
                        jx = {widgetExportRequest: {
                            widgetName: cfg.name,
                            contextItemName: cfg.C,
                            includeContent: true,
                            includeGroups: true,
                            includeSharedResources: true
                        }};
                        break;
                    case 'container':
                        jx = {containerExportRequest: {
                            containerName: cfg.name,
                            contextItemName: cfg.C,
                            includeContent: true,
                            includeGroups: true,
                            includeSharedResources: true
                        }};
                        break;
                    default:
                        if (cfg.type !== 'model') return error(new Error('Wrong export type: ' + chalk.gray(cfg.type)));
                        action = 'get';
                        break;
                }

                loading.start();
                if (action === 'post') {
                    runOrchestratorExport(jx);
                } else {
                    return bbrest.export().get()
                    .then(function(r) {
                        if (r.error) return error(r);
                        return handlePortalXml(_.unescape(r.body))
                        .then(function(r) {
                            loading.stop();
                            if (typeof r === 'string') console.log(r);
                            else ok(r);
                        });
                    }).catch(error);
                }

            });

        });
    }
});

function getPortal() {
    if (bbrest.config.portal) return Q(bbrest.config.portal);
    return bbrest.server().get()
    .then(function(v) {
        v = jxon.stringToJs(_.unescape(v.body));
        var portals = _.pluck(v.portals.portal, 'name');
        var defer = Q.defer();

        inquirer.prompt([{
            message: 'Choose the portal you want to export',
            name: 'name',
            type: 'list',
            choices: portals
        }], function (answers) {
            defer.resolve(answers.name);
        });
        return defer.promise;
    });
}

function runOrchestratorExport(jx) {
    if (!cfg.save) return error(new Error('File to save to must be defined.'));
    var toPost = cfg.file || jx;

    return bbrest.export().post(toPost)
    .then(function(r) {
        if (r.error) {
            return error(new Error('Error while exporting from Orchestrator'));
        }
        var id = jxon.stringToJs(_.unescape(r.body)).exportResponse.identifier;
        return bbrest.export(id).file(cfg.save).get()
        .then(function(r) {
            if (cfg.chunk) {
                return unzip()
                .then(function(dir) {
                    var exDir = path.parse(id).name;
                    var exPath = path.resolve(dir, exDir);
                    var xmlPath = path.resolve(exPath, 'portalserver.xml');
                    return readFile(xmlPath)
                    .then(function(x) {
                        return handlePortalXml(x.toString())
                        .then(function() {
                            var content = 'contentservices.zip';
                            return move(path.resolve(exPath, content), path.resolve(dir, content))
                            .then(function() {
                                return remove(exPath)
                                .then(ok);
                            });
                        });
                    });
                });
            } else {
                return ok(r);
            }
        });
    }).catch(error);
}

function error(err) {
    loading.stop();
    util.err(chalk.red('bb export: ') + (err.message || err.error));
}
function ok(r) {
    loading.stop();
    util.ok('Portal `' + bbrest.config.portal + '` exported to: ' + chalk.green(cfg.save));
    return r;
}

function handlePortalXml(x) {
    var jx = sort(jxon.stringToJs(x));
    if (cfg.save) {
        if (cfg.chunk) {
            return chunkXml(jx);
        } else {
            return saveFile(cfg.s, jxon.jsToString(jx));
        }
    }
    if (cfg.pretty) x = formattor(jxon.jsToString(jx), {method: 'xml'});
    return Q(x);
}

function saveFile(fileName, x) {
    if (cfg.pretty) x = formattor(x, {method: 'xml'});
    return writeFile(fileName, x)
    .catch(function(err) {
        if (err.code === 'ENOENT') {
            return mkdirp(getDir())
            .then(function() {
                return saveFile(fileName, x);
            });
        } else return err;
    });
}

function getDir() {
    var pth = path.parse(path.resolve(cfg.save));
    return path.resolve(pth.dir, pth.name);
}

function unzip() {
    var defer = Q.defer();
    var dir = getDir();

    return remove(dir)
    .then(function() {
        extract(cfg.save, {dir: dir}, function(err) {
            if (err) defer.reject(err);
            else {
                defer.resolve(dir);
            }
        });
        return defer.promise;
    });
}

function getMeta(metaPath) {
    return readFile(metaPath)
    .then(function(ms) {
        return remove(metaPath)
        .then(function() {
            return jxon.stringToJs(ms.toString());
        });
    })
    .catch(function() {
        return {
            backbaseArchiveDescriptor: {}
        };
    });
}

function chunkXml(jx) {
    var dir = getDir();
    return getMeta(path.resolve(dir, 'metadata.xml'))
    .then(function(metaFile) {
        var meta = metaFile.backbaseArchiveDescriptor.bbexport = {};
        meta.exportBundle = {};
        var all = [];

        _.each(jx.exportBundle, function(v, k) {
            if (typeof v === 'object') {
                var n = {};
                n[k] = v;
                all.push(saveFile(path.resolve(dir, _.kebabCase(k) + '.xml'), jxon.jsToString(n)));
            } else {
                // do not export bundleId and bundleName because of sorting
                if (k.substr(0, 6) !== 'bundle') meta.exportBundle[k] = v;
            }
        });

        all.push(saveFile(path.resolve(dir, 'metadata.xml'), jxon.jsToString(metaFile)));
        return Q.all(all);
    });
}

function sort(jx) {
    _.each(jx.exportBundle, function(v, k) {
        if (typeof v === 'object') {
            sortItems(v);
        }
    });
    return jx;
}

function sortItems(items) {
    var key = _.keys(items)[0];
    var col = items[key];

    // items that have no name: bundleRight, contentItemRef
    // warning: if there is only one object in collection it is returned as object not as array of objects

    // console.log('---', key);
    if (col instanceof Array) {
        if (key === 'bundleRight') col = _.sortBy(col, 'itemName');
        else if (key === 'contentItemRef') col = _.sortBy(col, '$itemName');
        else col = _.sortBy(col, 'name');

        _.each(col, function(v) {
            sortItem(v);
        });
    } else {
        sortItem(col);
    }
    return items;
}

function sortItem(item) {
    if (item.properties) {
        item.properties.property = _.sortBy(item.properties.property, '$name');
    } else if (item.rights && item.rights.itemRight) {
        item.rights.itemRight = _.sortBy(item.rights.itemRight, '$name');
        item.rights.propertyRight = _.sortBy(item.rights.propertyRight, '$name');
    }
    if (item.tags && item.tags.tag) {
        item.tags.tag = _.sortByAll(item.tags.tag, ['_', '$type', '$blacklist']);
    }

}
