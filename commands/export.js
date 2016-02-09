var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var formattor = require('formattor');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs-extra-promise');
var path = require('path');
var DecompressZip = require('decompress-zip');
var inquirePortal = require('../lib/inquirePortal');
var os = require('os');

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
        r += '      -s,  --save <string>\t\t\t' + d('portal-name.ext') + '\tFile or dir to save the export to.\n';
        r += '      -t,  --type <string>\t\t\t' + d('model') + '\t\tWhat to export: model(portal without content), portal, widget, container\n';
        r += '      -n,  --name <string>\t\t\t\t\tName of the widget or container to export.\n';
        r += '      -C,  --item-context <string>\t\t' + d('[BBHOST]') + '\tContext of the widget or container that is to be exported.\n';
        r += '           --pretty <boolean>\t\t\t' + d('true') + '\t\tPrettify the output.\n';
        r += '           --sanitize <boolean>\t\t\t' + d('true') + '\t\tSanitize the output.\n';
        r += '      -k,  --chunk <boolean>\t\t\t' + d('false') + '\t\tParse output and chunk it into multiple files.\n';
        r += '      -f,  --force <boolean>\t\t\t' + d('false') + '\t\tForce overwrite.\n\n';

        r += '           --host <string>\t\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '           --port <number>\t\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '           --context <string>\t\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '           --username <string>\t\t\t' + d('admin') + '\t\tUsername.\n';
        r += '           --password <string>\t\t\t' + d('admin') + '\t\tPassword.\n';
        r += '           --portal <string>\t\t\t\t\tName of the portal on the server to target.\n';
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb export \t\t\t\t\t\t\t\tOutputs prettified, sorted xml file.\n';
        r += '      bb export --save myPortal.xml\t\t\t\t\t\tSaves export to myPortal.xml\n';
        r += '      bb export --portal my-portal --save myPortal -k\t\t\t\tChunks my-portal export to myPortal dir\n';
        r += '      bb export --type portal --save retail.zip\t\t\t\t\tSaves export including content to retail.zip\n';
        r += '      bb export --type portal --portal retail-banking --save retail.zip -k\tChunks full portal export(including content) into retail dir\n';
        r += '      bb export -s accounts --type widget --name accounts -k\t\t\tChunks export of accounts widget into accounts dir\n';
        return r;
    },

    options: util.buildOpts({
        save: {type: 'string', alias: 's'},
        type: {type: 'string', alias: 't', default: 'model'},
        name: {type: 'string', alias: 'n'},
        'item-context': {type: 'string', alias: 'C'},
        pretty: {type: 'boolean', default: true},
        sanitize: {type: 'boolean', default: true},
        chunk: {type: 'boolean', alias: 'k', default: false},
        force: {type: 'boolean', alias: 'f', default: false}
    }),

    run: function () {

        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;
            jxon.config({parseValues: false});

            // check if save destination is proper
            return getPortal()
            .then(function(portal) {
                bbrest.config.portal = portal;

                return checkSave()
                .then(function() {

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
                            if (!cfg.name) throw new Error('Name of the widget must be defined. Use --name flag to define it.');
                            jx = {exportRequest: {widgetExportRequest: {
                                widgetName: cfg.name,
                                contextItemName: cfg.C || '[BBHOST]',
                                includeContent: true,
                                includeGroups: true,
                                includeSharedResources: true
                            }}};
                            break;
                        case 'container':
                            if (!cfg.name) throw new Error('Name of the container must be defined. Use --name flag to define it.');
                            jx = {exportRequest: {containerExportRequest: {
                                containerName: cfg.name,
                                contextItemName: cfg.C || '[BBHOST]',
                                includeContent: true,
                                includeGroups: true,
                                includeSharedResources: true
                            }}};
                            break;
                        default:
                            if (cfg.type !== 'model') return error(new Error('Wrong export type: ' + chalk.gray(cfg.type)));
                            action = 'get';
                            break;
                    }

                    util.spin.start();
                    if (action === 'post') {
                        runOrchestratorExport(jx);
                    } else {
                        return bbrest.export().get()
                        .then(function(r) {
                            if (r.error) return error(r);
                            return handlePortalXml(_.unescape(r.body))
                            .then(ok);
                        }).catch(error);
                    }

                });

            });

        }).catch(error);
    }
});

function checkSave() {
    // auto generate export file name
    if (!cfg.save) {
        var name;
        if (cfg.type === 'widget' || cfg.type === 'container') name = [cfg.name, 'zip'];
        else name = [bbrest.config.portal, (cfg.type === 'model') ? 'xml' : 'zip'];

        if (cfg.chunk) cfg.save = name[0];
        else cfg.save = name.join('.');
    }

    return fs.existsAsync(cfg.save)
    .catch(function() {
        if (cfg.force) return fs.removeAsync(cfg.save);
        throw new Error(chalk.gray(cfg.save) + ' exists. Use --force(-f) flag to overwrite it.');
    });
}

function getPortal() {
    if (bbrest.config.portal) return Q(bbrest.config.portal);

    if (cfg.type === 'widget' || cfg.type === 'container') return Q('');
    return inquirePortal(bbrest, jxon);
}

function runOrchestratorExport(jx) {
    var toPost = cfg.file || jx;

    return bbrest.export().post(toPost)
    .then(function(r) {
        if (r.error) {
            console.log(r);
            return error(new Error('Error while exporting from Orchestrator'));
        }
        var id = jxon.stringToJs(_.unescape(r.body)).exportResponse.identifier;
        var savePath = cfg.chunk ? path.resolve(os.tmpdir(), 'bb_export_tmp') : cfg.save;
        return bbrest.export(id).file(savePath).get()
        .then(function(r) {
            if (cfg.chunk) {
                return unzip(savePath, cfg.save)
                .then(function() {
                    var exDir = path.parse(id).name;
                    var exPath = path.resolve(cfg.save, exDir);
                    var xmlPath = path.resolve(exPath, 'portalserver.xml');
                    return fs.readFileAsync(xmlPath)
                    .then(function(x) {
                        return handlePortalXml(x.toString(), path.resolve(cfg.save, 'metadata.xml'))
                        .then(function(contentRepoId) {
                            var content = (cfg.type === 'portal') ? 'contentservices.zip' : 'resource.zip';
                            var moves = [
                                fs.moveAsync(path.resolve(exPath, content), path.resolve(cfg.save, content))
                            ];
                            if (contentRepoId) {
                                var repoZip = contentRepoId + '.zip';
                                moves.push(fs.moveAsync(path.resolve(exPath, repoZip), path.resolve(cfg.save, repoZip)));
                            }
                            return Q.all(moves)
                            .finally(function() {
                                return fs.removeAsync(exPath)
                                .then(ok);
                            })
                            .catch(function() {

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
    util.spin.stop();
    util.err(chalk.red('bb export: ') + (err.message || err.error));
}
function ok(r) {
    util.spin.stop();
    util.ok('Writing to ' + chalk.green(cfg.save) + '. Done.');
    return r;
}

function handlePortalXml(x, metaFile) {
    var jx = sort(jxon.stringToJs(x));
    if (cfg.chunk) {
        var props = _.get(jx, 'exportBundle.portalContentRepositories.contentRepository.properties.property');
        var id = props ? _.find(props, {$name: 'repositoryId'}).value._ : '';
        //_.where(jx.exportBundle.portalContentRepositories.contentRepository.properties.property, {$name: 'repositoryId'})[0].value._);
        return chunkXml(jx, metaFile)
        .then(function() {
            return id;
        });
    } else {
        if (cfg.pretty) x = formattor(jxon.jsToString(jx), {method: 'xml'});
        return fs.writeFileAsync(cfg.save, x);
    }
}

function unzip(src, dir) {
    var defer = Q.defer();

    return fs.removeAsync(dir)
    .then(function() {
        var unzipper = new DecompressZip(src);
        unzipper.on('error', function (err) {
            defer.reject(err);
        });
        unzipper.on('extract', function () {
            defer.resolve(true);
        });
        unzipper.extract({
            path: dir
        });
        return defer.promise;
    });
}

function getMeta(metaPath) {
    return fs.readFileAsync(metaPath)
    .then(function(ms) {
        return fs.removeAsync(metaPath)
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

function chunkXml(jx, metaFile) {
    return getMeta(metaFile)
    .then(function(metaFile) {
        if (_.isEmpty(metaFile.backbaseArchiveDescriptor)) {
            metaFile.backbaseArchiveDescriptor = {
                includesContent: false
            };
        }
        var meta = metaFile.backbaseArchiveDescriptor.bbexport = {};
        meta.exportBundle = {};
        var all = [];
        var order = [];

        _.each(jx.exportBundle, function(v, k) {
            order.push(k);
            if (typeof v === 'object') {
                var n = {};
                n[k] = v;
                all.push(saveFile(path.resolve(cfg.save, _.kebabCase(k) + '.xml'), jxon.jsToString(n)));
            }
        });

        meta.order = order.join(',');
        all.push(saveFile(path.resolve(cfg.save, 'metadata.xml'), jxon.jsToString(metaFile)));
        return Q.all(all);
    });
}

// saves files to destination folder when they are chunks
function saveFile(fileName, x) {
    if (cfg.pretty) x = formattor(x, {method: 'xml'});
    return fs.writeFileAsync(fileName, x)
    .catch(function(err) {
        if (err.code === 'ENOENT') {
            return fs.mkdirpAsync(cfg.save)
            .then(function() {
                return saveFile(fileName, x);
            });
        } else return err;
    });
}

function sort(jx) {
    _.each(jx.exportBundle, function(v) {
        if (typeof v === 'object') {
            v = sortItems(v);
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

        _.each(col, function(v, k) {
            items[key][k] = sortItem(v, key);
        });
    } else {
        items[key] = sortItem(col, key);
    }
    return items;
}

function sortItem(item, key) {
    if (_.has(item, 'properties')) {
        item = cleanItem(item, key);
        //item = sanitizeItem(item);
    } else if (item.rights && item.rights.itemRight) {
        if (item.rights.itemRight instanceof Array) {
            item.rights.itemRight = _.sortBy(item.rights.itemRight, '$name');
        }
        if (item.rights.propertyRight instanceof Array) {
            item.rights.propertyRight = _.sortBy(item.rights.propertyRight, '$name');
        }
    }
    if (item.tags && item.tags.tag && item.tags.tag instanceof Array) {
        item.tags.tag = _.sortByAll(item.tags.tag, ['_', '$type', '$blacklist']);
    }
    return item;
}
// itemHandlerBeanName: 'portalHandler',
//   createdBy: '2',
//   createdTimestamp: '2015-06-30T10:58:18.772+02:00',
//   lastModifiedBy: '2',
//   lastModifiedTimestamp: '2015-06-30T10:58:28.895+02:00',
//   hidden: 'false',
//   contents: '',
//   tags: '',
//   uuid: 'a28599b4-b994-4ac3-ae66-b379ef5b3d24',
//   lockState: 'UNLOCKED',
//   children: '' }
var itemBlackList = {
    itemHandlerBeanName: true,
    createdBy: true,
    createdTimestamp: true,
    lastModifiedBy: true,
    lastModifiedTimestamp: true,
    contents: true,
    hidden: true,
    lockState: true,
    children: true
};
// DO NOT REMOVE uuid

// var logged = {};
function cleanItem(item) {

    var newItem = {};
    var keys = _.keys(item).sort();

    if (cfg.sanitize) {
        _.each(keys, function(k) {
            if (!itemBlackList[k]) newItem[k] = item[k];
        });
    } else {
        _.each(keys, function(k) {
            newItem[k] = item[k];
        });
    }

    item = newItem;
    item = cleanProps(item);
    if (cfg.sanitize) item = cleanTags(item);

    return item;

    // if (!logged[key]) {
    //     console.log('----------', key, _.has(item, 'properties.property'));
    //     console.log(item);
    // }
    // logged[key] = true;
}

function cleanProps(item) {
    if (_.has(item, 'properties.property')) {

        if (item.properties.property.length > 0) {

            if (cfg.sanitize) {
                var removeInheritedProperties = {};

                _.each(item.properties.property, function (property) {
                    // remove inherited props
                    if (property.$itemName) {
                        removeInheritedProperties[property.$name] = true;
                    }
                    delete property.$readonly;
                    delete property.$manageable;
                    delete property.$itemName;
                });

                //when reading rest remove inherited values so matches local version
                _.remove(item.properties.property, function (value) {
                    return removeInheritedProperties[value.$name] ? true : false;
                });
            }

            item.properties.property = _.sortBy(item.properties.property, '$name');
        }
    }
    // DO NOT DELETE empty properties tag
    return item;
}

function cleanTags(item) {

    // DO NOT DELETE square brackets from extended

    if (item.tags && item.tags.tag) {
        if (item.tags.tag.length > 0) {
            _.forEach(item.tags.tag, function (tag) {
                //Remote items in 5.6 have blacklist set to false by default
                //if (!tag.$blacklist) {
                //tag['$blacklist'] = 'false';
                //}
                delete tag.$manageable;
            });
        } else {
            delete item.tags;
        }
    } else if (item.tags) {
        delete item.tags;
    }
    return item;
}

/**
 * Removes all unwanted inherited values and generated model from remote items
 * So they can be compared with clean local model
 * @param {object} item
 * @returns {object} new cleaned item
 */
// function sanitizeItem(item) {
//
//     // Only for templates, but not validating item type here
//     var fieldWhitelist = ['name',
//         'contextItemName',
//         'parentItemName',
//         'extendedItemName',
//         'properties',
//         'tags',
//         'type'
//     ];
//
//     for (var field in item) {
//         if (!_.contains(fieldWhitelist, field)) {
//             delete item[field];
//         }
//     }
//
//     //Remote items remove the [] from the extended items name,
//     // so we will remove the local ones to match
//     if (item.extendedItemName) {
//         //As the remote item has removed its brackets we will follow :(
//         //TODO: Raise with CXP team
//         item.extendedItemName = item.extendedItemName.replace(/\[|\]/g, '');
//         //if (item.contextItemName !== '[BBHOST]' && item.tags) {
//         if (item.tags) {
//             //TODO: Check tags inheritance and raise with CXP team
//             //As the remote item is showing inherited tags, with no way if knowing if
//             // these are owned or inherited we will assume extended items can't
//             // own tags and remove them
//             delete item.tags;
//         }
//     }
//
//     if (item.tags && item.tags.tag) {
//         if (item.tags.tag.length > 0) {
//             _.forEach(item.tags.tag, function (tag) {
//                 //Remote items in 5.6 have blacklist set to false by default
//                 //if (!tag.$blacklist) {
//                 //tag['$blacklist'] = 'false';
//                 //}
//                 delete tag.$manageable;
//             });
//         } else {
//             delete item.tags;
//         }
//     } else if (item.tags) {
//         delete item.tags;
//     }
//
//     if (item.properties && item.properties.property) {
//         if (item.properties.property.length > 0) {
//             var removeInheritedProperties = {};
//
//             _.forEach(item.properties.property, function (property) {
//                 //TODO: templates don't return $itemName attr, another small inconsistency
//                 if ((property.$itemName && property.$itemName === item.name) || item.type) {
//                     delete property.$readonly;
//                     delete property.$manageable;
//                     delete property.$itemName;
//
//                     //TODO: property type values are auto generated differently and stored as
//                     //      Title case, we will make them all lowercase
//                     property.value.$type = property.value.$type.toLowerCase();
//
//                 } else if (property.$itemName) {
//                     removeInheritedProperties[property.$name] = true;
//                 }
//             });
//
//             //when reading rest remove inherited values so matches local version
//             _.remove(item.properties.property, function (value) {
//                 return removeInheritedProperties[value.$name] ? true : false;
//             });
//         } else {
//             delete item.properties;
//         }
//     } else if (item.properties) {
//         delete item.properties;
//     }
//
//     return item;
// }

