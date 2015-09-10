var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs-extra-promise');
var path = require('path');
var unzip = require('../lib/unzip');
var Cmis = require('../lib/cmis');
var sortItems = require('../lib/sortItems');

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
        r += '      -t,  --target <string>\t\t\t\t\tzip file to import.\n\n';

        r += '           --host <string>\t\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '           --port <number>\t\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '           --context <string>\t\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '           --username <string>\t\t\t' + d('admin') + '\t\tUsername.\n';
        r += '           --password <string>\t\t\t' + d('admin') + '\t\tPassword.\n';
        r += '           --portal <string>\t\t\t\t\tName of the portal on the server to target.\n';
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb import-page -t home-page.zip --portal retail-banking\t\t\tImports home-page.zip to retail-banking portal.\n';
        return r;
    },

    options: {
        target: {type: 'string', alias: 't'}
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
            // console.log(err.statusCode, err.statusInfo, err.error);
            error(err);
        })
        .done();
    }
});

function parseExport(data) {
    return checkCatalogItems(data)
    .then(importPage)
    .then(replaceManageable)
    .then(importItems);
}

// function getPortal() {
//     if (bbrest.config.portal) return Q(bbrest.config.portal);
//     return inquirePortal(bbrest, jxon);
// }

function checkCatalogItems(data) {
    var all = [];
    var cnt = 0;
    _.each(data.catalog, function(type, name) {
        cnt++;
        all.push(
            bbrest[type](name).get()
        );
    });
    console.log('Checking for ' + cnt + ' extended items...');
    return Q.all(all)
    .then(function(results) {
        var errors = false;
        _.each(results, function(res) {
            if (res.error) {
                if (typeof res.error === 'string') console.log(res.error);
                else console.log(res.body);
                errors = true;
            }
        });
        if (errors) {
            throw new Error('Problem checking for catalog items');
        }
        return data;
    });
}

function importPage(data) {
    console.log('Importing page...');
    data.container = sortItems(data.container); // do it again
    return putOrPost('page', data.page)
    .then(function() {
        return data;
    });
}

function replaceManageable(data) {
    console.log('Replacing manageable instances...');
    return bbrest.page(data.page.name).query({depth: 0}).get()
    .then(function(res) {
        var jx = jxon.stringToJs(_.unescape(res.body));
        var names = {};
        var inds = [];

        if (!jx.page.children.container) return data;

        // names will contain names of newly created manageable area instances
        traverseContainers(jx.page.children.container, names);
        // replace old manageable area instance names with new ones
        _.each(data.closures, function(marea, cont) {
            data.closures[cont] = names[marea];
            _.each(data.container, function(item, ind) {
                if (item.parentItemName === cont) {
                    item.parentItemName = names[marea];
                }
                if (item.name === cont) {
                    inds.unshift(ind);
                }
            });
            _.each(data.widget, function(item) {
                if (item.parentItemName === cont) {
                    item.parentItemName = names[marea];
                }
            });
        });
        // remove old manageable area instances
        _.each(inds, function(id) {
            data.container.splice(id, 1);
        });
        return data;
    });

}

function traverseContainers(conts, names) {
    if (conts instanceof Array) {
        _.each(conts, function(cont) {
            traverseContainers(cont, names);
        });
    } else {
        if (conts.extendedItemName && conts.contextItemName !== '[BBHOST]') {
            names[conts.extendedItemName] = conts.name;
        }
        if (conts.children && conts.children.container) traverseContainers(conts.children.container, names);
    }
}

function importItems(data) {
    console.log('Importing items...');
    var all = [];
    all.push({
        type: 'link',
        jx: data.link
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
    // return deleteItem(type, jx);
    var njx = {};
    var one = {};
    one[type] = jx;
    njx[type + 's'] = one;
    // we need to post master page to portalCatalog, otherwise it is not working?
    if (type === 'page' && !jx.extendedItemName) {
        type = 'portalCatalog';
        one = njx = {catalog: one};
    }
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
            return req.post(one);
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
        } else {
            console.log(res);
            out.unshift(chalk.red(res.statusCode));
            out.push(res.error || res.body);
            console.log(out.join(' '));
        }
        return res;
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
    _.each(contents, function(val) {
        var cmis = new Cmis({
            path: val.cmis.path,
            type: val.cmis.objectTypeId,
            mimeType: val.mimeType
        }, bbrest.config, jxon);

        if (val.cmis.objectTypeId === 'bb:richtext') {
            all.push(cmis.importText(val.content));
        } else if (val.cmis.objectTypeId === 'bb:image') {
            all.push(cmis.importImage(path.resolve(unzipPath, val.cmis.objectId, val.bb.title)));
        }
    });
    return Q.all(all)
    .then(function() {
        console.log(chalk.green('OK') + ' CONTENT ' + chalk.gray(jx.name));
    })
    .catch(function() {
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
