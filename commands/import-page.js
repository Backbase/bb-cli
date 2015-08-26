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

            return getPortal()
            .then(function(portal) {
                bbrest.config.portal = portal;

                return unzip(cfg.target)
                .then(function(path) {
                    unzipPath = path;
                    return fs.readJsonAsync(path + 'page-export.json')
                    .then(function(data) {
                        return checkCatalogItems(data.catalog)
                        .then(function() {
                            return importPage(data.page);

                            return importContainers(data.container)
                            .then(function() {
                                return importWidgets(data.widget);
                            });
                        });
                    });
                });
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

function getPortal() {
    if (bbrest.config.portal) return Q(bbrest.config.portal);
    return inquirePortal(bbrest, jxon);
}

function checkCatalogItems(data) {
    var all = [];
    var cnt = 0;
    for (var itemName in data) {
        cnt++;
        all.push(
            bbrest.catalog().get(itemName)
            .then(function(res) {
                return !res.error;
            })
        );
    };
    console.log('Checking for ' + cnt + ' extended items...');
    return Q.all(all);
}
function importPage(page) {
    console.log('Importing page...');
    console.log(page);
    return putOrPost('page', page);
}

function importContainers(conts) {
    console.log('Importing ' + conts.length + ' containers...');
    var all = [];
    _.each(conts, function(cont) {
        all.push(
            putOrPost('container', cont)
        );
    });
    return Q(all);
}

function putOrPost(type, jx) {
    var njx = {};
    var one = {};
    one[type] = jx;
    njx[type + 's'] = one;
    var req = bbrest[type]();
    req.headers.Connection = 'keep-alive';
    return req.put(njx)
    .then(function(res) {
        if (res.error && res.statusCode === 404) {
            return bbrest[type]().post(one)
            .then(function() {
                console.log(chalk.gray(jx.name) + ' ' + chalk.yellow('post') + ' ' + chalk.green('OK'));
            });
        } else {
            console.log(chalk.gray(jx.name) + ' ' + chalk.yellow('put') + ' ' + chalk.green('OK'));
        }
    });
}

function importWidgets(widgs) {
    console.log('Importing ' + widgs.length + ' widgets...');
    var all = [];
    _.each(widgs, function(widg) {
        all.push(
            putOrPost('widget', widg)
        );
        // if (widg.referencedContentItems) {
        //     // console.log(widg.referencedContentItems);
        // }
    });
    return Q(all);
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
