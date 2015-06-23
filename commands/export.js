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
var path = require('path');
var extract = require('extract-zip');

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
        r += '      -s,  --save <string>\t\t' + '\t\tFile to save the response to. Or dir if export is parsed.\n';
        r += '      -t,  --type <string>\t\t' + d('model') + '\t\tWhat to export: model(portal without content), portal, widget, container\n';
        r += '      -n,  --name <string>\t\t\t\tName of the widget or container to export.\n';
        r += '      -C,  --type-context <string>\t\t\tContext of the widget or container that is to be exported.\n';
        r += '           --pretty <boolean>\t\t' + d('true') + '\t\tPrettify the output.\n';
        r += '      -k,  --chunk <boolean>\t\t' + d('false') + '\t\tParse output and chunk it into multiple files.\n';
        return r;
    },

    options: {
        save: {type: 'string', alias: 's'},
        type: {type: 'string', alias: 't', default: 'model'},
        name: {type: 'string', alias: 'n'},
        'type-context': {type: 'string', alias: 'C'},
        pretty: {type: 'boolean', default: true},
        chunk: {type: 'boolean', alias: 'k', default: false}
    },

    run: function () {

        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;
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
                        widgetName: cfg.widget,
                        contextItemName: cfg.contextItem,
                        includeContent: true,
                        includeGroups: true,
                        includeSharedResources: true
                    }};
                    break;
                case 'container':
                    jx = {containerExportRequest: {
                        containerName: cfg.container,
                        contextItemName: cfg.contextItem,
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
                if (!cfg.save) return error(new Error('Destination file must be defined'));
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
                            return parseExport()
                            .then(function(dir) {
                                var exDir = path.parse(id).name;
                                var exPath = path.resolve(dir, exDir);
                                var xmlPath = path.resolve(exPath, 'portalserver.xml');
                                return readFile(xmlPath)
                                .then(function(x) {
                                    return handlePortalXml(x.toString(), dir, exDir)
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
            } else {
                return bbrest.export().get()
                .then(function(r) {
                    return handlePortalXml(_.unescape(r.body))
                    .then(function(r) {
                        if (typeof r === 'string') console.log(r);
                        else ok(r);
                    });
                }).catch(error);
            }


        });
    }
});

function error(err) {
    loading.stop();
    util.err(chalk.red('bb export: ') + err.message);
}
function ok(r) {
    loading.stop();
    util.ok('Portal `' + cfg.portal + '` exported to: ' + chalk.green(cfg.save));
    return r;
}

function handlePortalXml(x, dir, exDir) {
    if (cfg.save) {
        if (cfg.chunk) {
            return chunkXml(x, dir, exDir);
        } else {
            return saveFile(cfg.s, x);
        }
    }
    if (cfg.pretty) x = formattor(x, {method: 'xml'});
    return x;
}

function saveFile(fileName, x) {
    if (cfg.pretty) x = formattor(x, {method: 'xml'});
    return writeFile(fileName, x);
}

function parseExport() {
    var pth = path.parse(path.resolve(cfg.save));
    var defer = Q.defer();
    var dir = path.resolve(pth.dir, pth.name);

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

function chunkXml(x, dir, exDir) {
    return getMeta(path.resolve(dir, 'metadata.xml'))
    .then(function(metaFile) {
        var meta = metaFile.backbaseArchiveDescriptor.bbexport = {};
        meta.exportBundle = {};
        meta.exportFileName = exDir;
        var jx = jxon.stringToJs(x);
        var all = [];
        _.each(jx.exportBundle, function(v, k) {
            if (typeof v === 'object') {
                var n = {};
                n[k] = sortItems(v);
                all.push(saveFile(path.resolve(dir, _.kebabCase(k) + '.xml'), jxon.jsToString(n)));
            } else {
                meta.exportBundle[k] = v;
            }
        });
        all.push(saveFile(path.resolve(dir, 'metadata.xml'), jxon.jsToString(metaFile)));
        return Q.all(all);
    });
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
            // console.log('  ', v.name || v.itemName || v.$itemName);
            if (v.properties) {
                v.properties.property = _.sortBy(v.properties.property, '$name');
                // _.each(v.properties.property, function(p) {
                //     console.log('    ', p.$name);
                // });
            }
        });
    }
    return items;
}
