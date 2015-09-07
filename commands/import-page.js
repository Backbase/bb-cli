var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs-extra-promise');
var path = require('path');
var zipDir = require('../lib/zipDir');
var unzip = require('../lib/unzip');
var temp = require('promised-temp');
var request = require('request-promise');
var inquirePortal = require('../lib/inquirePortal');
var formattor = require('formattor');
var Cmis = require('../lib/cmis');

var Command = require('ronin').Command;

var bbrest, jxon, cfg, unzipPath;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Imports portal page.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description';
        r += '\n\t  All `bb rest` options for configuring portal, context, username etc are valid.\n\n';
        r += '      -t,  --target <string>\t\t\t\tzip file to import.\n';
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
        r += '      bb export --portal my-portal --save myPortal -k\t\t\tChunks my-portal export to myPortal dir\n';
        r += '      bb export --type portal --save retail.zip\t\t\t\t\tSaves export including content to retail.zip\n';
        r += '      bb export --type portal --portal retail-banking --save retail.zip -k\tChunks full portal export(including content) into retail dir\n';
        r += '      bb export -s accounts --type widget --name accounts -k\t\t\tChunks export of accounts widget into accounts dir\n';
        return r;
    },

    options: {
        target: {type: 'string', alias: 't'},
        name: {type: 'string', alias: 'n'},
        'item-context': {type: 'string', alias: 'C'},
        pretty: {type: 'boolean', default: true},
        sanitize: {type: 'boolean', default: true},
        chunk: {type: 'boolean', alias: 'k', default: false},
        force: {type: 'boolean', alias: 'f', default: false}
    },

    run: function () {
        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;

            if (cfg.target === undefined) throw new Error('Target path is missing. Use --target');

            console.log('Extracting zip...');
            return unzip(cfg.target)
            .then(function(path) {
                unzipPath = path;

                console.log('Parsing export data...');
                return fs.readJsonAsync(path + 'page-export.json')
                .then(parseExport);
            });

        })
        .then(ok)
        .catch(function(err) {
            console.log(err.statusCode, err.statusInfo, err.error);
            error(err);
        })
        .done();
    }
});

function parseExport(data) {
    return checkCatalogItems(data)
    .then(importItems);
}

// function getPortal() {
//     if (bbrest.config.portal) return Q(bbrest.config.portal);
//     return inquirePortal(bbrest, jxon);
// }

function checkCatalogItems(data) {
    var all = [];
    var cnt = 0;
    for (var itemName in data.catalog) {
        cnt++;
        all.push(
            bbrest.catalog(itemName).get()
        );
    };
    console.log('Checking for ' + cnt + ' extended items...');
    return Q.all(all)
    .then(function(results) {
        var errors = false;
        _.each(results, function(res) {
            if (res.error) {
                console.log(res.error);
                errors = true;
            }
        });
        if (errors) {
            throw new Error('Problem checking for catalog items');
        }
        return data;
    });
}

function importItems(data) {
    console.log('Importing items...');
    var all = [];
    all.push({
        type: 'link',
        jx: data.link
    });
    all.push({
        type: 'page',
        jx: data.page
    });

    addItems(all, data, 'container');
    addItems(all, data, 'widget');
    return waterfall(all)
    .then(function() {
        return data;
    });
}

function addItems(all, data, type) {
    _.each(data[type], function(jx) {
        all.push({
            type: type,
            jx: jx
        });
    });
}

function waterfall(all) {
    var obj = all.shift();
    return putOrPost(obj.type, obj.jx)
    .then(function() {
        if (all.length) return waterfall(all);
    });
}

function putOrPost(type, jx) {
    delete jx.children;
    var njx = {};
    var one = {};
    one[type] = jx;
    njx[type + 's'] = one;
    var req = bbrest[type]();
    var contents;
    req.headers.Connection = 'keep-alive';
    if (jx.referencedContentItems) {
        contents = _.cloneDeep(jx.referencedContentItems);
        delete jx.referencedContentItems;
    }
    // console.log(formattor(jxon.jsToString(njx), {method: 'xml'}));
    return req.put(njx)
    .then(function(res) {
        if (res.statusCode >= 400) {
            return bbrest[type]().post(one);
        }
        return res;
    })
    .then(function(res) {
        var out = [jx.name, chalk.yellow(res.method), chalk.gray(res.href)];
        if (res.statusCode < 300) {
            out.unshift(chalk.green(res.statusCode));
            console.log(out.join(' '));
            if (contents) {
                return importContent(jx, contents);
            }
            if (type === 'page') {
                bbrest.page(jx.name).get()
                .then(function(res) {
                    var pjx = jxon.stringToJs(_.unescape(res.body));
                    var panels = pjx.page.children.container.children.container.children.container;
                    var our = _.find(panels, {name: 'panel-container-533529'});
                    console.log(our.children.container);
                });
            }
        } else {
            out.unshift(chalk.red(res.statusCode));
            out.push(res.error || res.body);
            console.log(out.join(' '));
        }
    });
}
function deleteItem(type, jx) {
    return bbrest[type](jx.name).delete()
    .then(function(res) {
        console.log(chalk.green('OK') + ' ' + jx.name + ' ' + chalk.yellow(res.method) + ' ' + chalk.gray(res.href));
    });
}

function importContent(jx, contents) {
    console.log(chalk.yellow('POST') + ' CONTENT ' + chalk.gray(jx.name));
    var all = [];
    _.each(contents, function(val, key) {
        var cmis = new Cmis({
            path: val.cmis.path,
            type: val.cmis.objectTypeId
        }, bbrest.config, jxon);

        if (val.cmis.objectTypeId === 'bb:richtext') {
            all.push(cmis.importText(val.content));
        } else if (val.cmis.objectTypeId === 'bb:image') {
            all.push(cmis.importImage(path.resolve(unzipPath, val.cmis.objectId, val.bb.title)));
        }
    });
    return Q.all(all)
    .then(function(rall) {
        console.log(chalk.green('OK') + ' CONTENT ' + chalk.gray(jx.name));
    })
    .catch(function(err) {
        console.log(chalk.red('ERR') + ' CONTENT ' + chalk.gray(jx.name));
    });
}

function error(err) {
    util.spin.stop();
    util.err(chalk.red('bb import-page: ') + (err.message || err.error));
}
function ok(r) {
    util.spin.stop();
    util.ok('Done.');
    return r;
}
