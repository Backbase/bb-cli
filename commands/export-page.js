var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs-extra-promise');
var path = require('path');
var cmisParse = require('../lib/cmis-parse');
var zipDir = require('../lib/zipDir');
var temp = require('promised-temp');
var request = require('request-promise');
var inquirePortal = require('../lib/inquirePortal');
var sortItems = require('../lib/sortItems');
var formattor = require('formattor');

var Command = require('ronin').Command;

var bbrest, jxon, cfg;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Exports portal pages.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description';
        r += '\n\t  All `bb rest` options for configuring portal, context, username etc are valid.\n\n';
        r += '      -s,  --save <string>\t\t\t' + d('portal-name.ext') + '\tFile to save the export to.\n';
        r += '      -n,  --name <string>\t\t\t\t\tName of the page to export.\n';
        r += '      -f,  --force <boolean>\t\t\t' + d('false') + '\t\tForce overwrite.\n\n';

        r += '           --host <string>\t\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '           --port <number>\t\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '           --context <string>\t\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '           --username <string>\t\t\t' + d('admin') + '\t\tUsername.\n';
        r += '           --password <string>\t\t\t' + d('admin') + '\t\tPassword.\n';
        r += '           --portal <string>\t\t\t\t\tName of the portal on the server to target.\n';
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb export-page --save home-page.zip --portal retail-banking -n page_0123456789 \t\tExports page_0123456789 to home-page.zip\n';
        
        return r;
    },

    options: {
        save: {type: 'string', alias: 's'},
        type: {type: 'string', alias: 't', default: 'model'},
        name: {type: 'string', alias: 'n'},
        'item-context': {type: 'string', alias: 'C'},
        pretty: {type: 'boolean', default: true},
        sanitize: {type: 'boolean', default: true},
        chunk: {type: 'boolean', alias: 'k', default: false},
        force: {type: 'boolean', alias: 'f', default: false}
    },

    run: function () {

        _.extend(this.options, {
            host: 'bb-breeze.backbase.com',
            port: 8280
        });

        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;

            if (cfg.save === undefined) throw new Error('Save path is missing. Use --save');

            return getPortal()
            .then(function(portal) {
                bbrest.config.portal = portal;

                console.log(chalk.yellow('GET'), 'page', chalk.gray(portal + ' > ' + cfg.name));
                return getPageByName(cfg.name)
                .then(parsePage);
            });

        })
        .then(ok)
        .catch(error)
        .done();
    }
});

function getPortal() {
    if (bbrest.config.portal) return Q(bbrest.config.portal);

    return inquirePortal(bbrest, jxon);
}
function getPageByName(name) {
    return bbrest.page(name).query({depth: 0}).get()
    .then(function(res) {
        // console.log(res.href);
        // console.log(formattor(_.unescape(res.body), {method: 'xml'}));
        var jx = jxon.stringToJs(_.unescape(res.body));
        var key = _.keys(jx);
        return jx[key];
    });
}

function parsePage(page) {
    console.log(chalk.yellow('PARSE'), 'page');
    var children = page.children;
    // delete page.children;
    var exportObj = getExportObj(page);
    cleanItem(page);
    if (page.extendedItemName) {
        exportObj.catalog[page.extendedItemName] = 'page';
    }

    return getLink(page.uuid)
    .then(function(link) {
        cleanItem(link);
        exportObj.link = link;

        return traverseChildren(children, exportObj)
        .then(function() {
            sortItems(exportObj.container);

            console.log(chalk.yellow('SAVE'), 'archive', chalk.gray(cfg.save));
            return saveAndZip(exportObj)
            .then(function(zip) {
                var moveOpts = {};
                if (cfg.force) moveOpts.clobber = true;
                return fs.moveAsync(zip.path, path.resolve(cfg.save), moveOpts)
                .then(function() {
                    zip.clean();
                });
            });
        });
    });
}

function getExportObj(page) {
    var ret = {
        page: page,
        // referenced links of the page
        link: [],
        // ordered instances of containers that belong to the page
        container: [],
        // instances of widgets that belong to the page
        widget: [],
        // items that are extended + templates of the container
        // check if those exist before importing
        catalog: {},
        // keys are names of the instances of instances of Manageable_Area_Closure
        // values are names of instances of Manageable_Area_Closure
        closures: {}
    };

    return ret;
}

function objOrCol(entry, callback) {
    if (entry instanceof Array) {
        _.each(entry, function(val) {
            callback(val);
        });
    } else {
        callback(entry);
    }
}

function cleanItem(item) {
    delete item.children;
    delete item.itemHandlerBeanName;
    delete item.createdBy;
    delete item.createdTimestamp;
    delete item.lastModifiedItem;
    delete item.lastModifiedBy;
    delete item.lastModifiedTimestamp;
    delete item.hidden;
    delete item.referencedItem;
    delete item.securityProfile;
    delete item.publishState;
    delete item.lockState;
    delete item.referencedLinks;
    return item;
}

function getLink(uuid) {
    return bbrest.link().query({f: 'property.ItemRef(eq)' + uuid}).get()
    .then(function(res) {
        var links = jxon.stringToJs(_.unescape(res.body)).links;
        if (links.link) return links.link;
        throw new Error();
    })
    .catch(function(err) {
        console.log('Error getting link for ItemRef = ' + uuid);
        throw err;
    });
}

function traverseChildren(children, exportObj) {
    var all = [];
    _.each(children, function(a, childType) {
        switch(childType) {
            case 'container':
                objOrCol(a, function(cont) {
                    var contChildren = cont.children;
                    all.push(add(cont, 'container', exportObj));
                    all.push(traverseChildren(contChildren, exportObj));
                });
                break;
            case 'widget':
                objOrCol(a, function(cont) {
                    all.push(add(cont, 'widget', exportObj));
                });
                break;
            default:
                break;
        }
    });
    return Q.all(all);
}

function add(item, type, exportObj) {
    var all = [];

    if (type === 'container') {// add template to catalog dependencies
        var props = item.properties.property;
        var template = _.find(props, {$name: 'TemplateName'}).value._;
        if (!exportObj.catalog[template]) exportObj.catalog[template] = 'template';
    }
    // add parent to cataog dependencies
    if (item.extendedItemName && !exportObj.catalog[item.extendedItemName]) {
        if (type === 'container' && item.contextItemName !== '[BBHOST]') {
            all.push(getExtendedItem(item.extendedItemName, exportObj, item));
        }
        exportObj.catalog[item.extendedItemName] = type;
    }
    if (item.extendedItemName === 'widget-advanced-content') {
        if (item.referencedContentItems) {
            console.log('Parsing content', chalk.gray(item.name));
            var parsed = cmisParse(item.referencedContentItems);
            item.referencedContentItems = parsed;
            _.each(parsed, function(content) {
                if (content.cmis.objectTypeId === 'bb:image') {
                    var imgPath = 'http://' + bbrest.config.host + ':' + bbrest.config.port + content.path;
                    all.push(writeImage(content.bb.title, content.cmis.objectId, imgPath));
                }
            });
        }
    }
    cleanItem(item);
    exportObj[type].unshift(item);
    return Q.all(all);
}

function getExtendedItem(extendedName, exportObj, item) {
    return bbrest.portalCatalog(extendedName).query({}).get()
    .then(function(res) {
        var jx = jxon.stringToJs(_.unescape(res.body));
        jx = jx[_.keys(jx)[0]];
        if (jx.extendedItemName === 'Manageable_Area_Closure' && jx.name !== 'Manageable_Area_Closure') {
            exportObj.closures[item.name] = jx.name;
            cleanItem(jx);
            exportObj.container.unshift(jx);
        } else {
            exportObj.catalog[extendedName] = 'container';
        }

    });
}

var tempDir;
function getTempDir() {
    if (tempDir) return tempDir;
    tempDir = temp.track().mkdir({dir: '/tmp/export-pages'});
    return tempDir;
}

function writeImage(name, id, imgUrl) {
    return getTempDir()
    .then(function(tmpDirPath) {
        var imgPath = path.resolve(tmpDirPath, id, name);
        var out = fs.createOutputStream(imgPath);
        var ret = request(imgUrl);
        ret.pipe(out);
        return ret;
    });
}

function saveAndZip(expo) {
    return getTempDir()
    .then(function(tmpDirPath) {
        var jsonPath = path.resolve(tmpDirPath, 'page-export.json');
        return fs.writeJsonAsync(jsonPath, expo)
        .then(function() {
            return zipDir(tmpDirPath);
        });
    });
}
function error(err) {
    util.err(chalk.red('bb export-pages: ') + (err.message || err.error));
}
function ok(r) {
    util.ok('Done.');
    return r;
}
