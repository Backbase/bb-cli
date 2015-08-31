var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs-extra-promise');
var path = require('path');
var cmis = require('../lib/cmis');
var zipDir = require('../lib/zipDir');
var temp = require('promised-temp');
var request = require('request-promise');

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
        r += '      -n,  --name <string>\t\t\t\tName of the page to export.\n';
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
            port: 8180
        });

        util.spin.start();
        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;
            jxon.config({parseValues: false});

            if (cfg.save === undefined) throw new Error('Save path is missing. Use --save');

            return getLastModifiedPage()
            .then(function(page) {
                var siblings = getNewPageCollection();
                return traverseChildren(page, siblings)
                .then(function() {
                    return saveAndZip(siblings)
                    .then(function(zip) {
                        var moveOpts = {};
                        if (cfg.force) moveOpts.clobber = true;
                        return fs.moveAsync(zip.path, path.resolve(cfg.save), moveOpts)
                        .then(function() {
                            zip.clean();
                        });
                    });
                });
                // console.log(siblings);
            });

        })
        .then(ok)
        .catch(function(err) {
            error(err);
        })
        .done();
    }
});

function getLastModifiedPage() {
    return getPages({
        ps: 1,
        depth: 12,
        s: 'lastModifiedTimestamp(dsc)'
    });
}

function getPages(q) {
    // query({f: 'extendedItemName(eq)page_1415023255184'})
    var bbp = bbrest.page();
    if (q) bbp = bbp.query(q);
    return bbp.get()
    .then(function(res) {
        var jx = jxon.stringToJs(_.unescape(res.body));
        return jx.pages.page;
    });
}

function getNewPageCollection() {
    return {
        // ordered instances of containers that belong to the page
        container: [],
        // instances of widgets that belong to the page
        widget: [],
        // items that are extended + templates of the container
        // check if those exist before importing
        catalog: {}
    };
}

function add(item, type, obj) {
    var ca = obj[type];
    var images;

    if (type === 'container') {// add template to catalog dependencies
        var props = item.properties.property;
        var template = _.find(props, {$name: 'TemplateName'}).value._;
        if (!obj.catalog[template]) obj.catalog[template] = true;
    }
    // add parent to cataog dependencies
    if (!obj.catalog[item.extendedItemName]) obj.catalog[item.extendedItemName] = true;
    if (item.extendedItemName === 'widget-advanced-content') {
        var parsed = cmis.parse(item.referencedContentItems);
        item.referencedContentItems = parsed;
        images = [];
        _.each(parsed, function(content) {
            if (content.cmis.objectTypeId === 'bb:image') {
                var imgPath = 'http://' + bbrest.config.host + ':' + bbrest.config.port + content.path;
                images.push(writeImage(content.bb.title, content.cmis.objectId, imgPath));
            }
        });
    }
    ca.unshift(item);
    if (images) return Q.all(images);
    return Q(true);
}

function traverseChildren(item, siblings) {
    var all = [];
    _.each(item.children, function(a, childType) {
        switch(childType) {
            case 'container':
                if (a instanceof Array) {
                    _.each(a, function(cont) {
                        all.push(add(cont, 'container', siblings));
                        all.push(traverseChildren(cont, siblings));
                    });
                } else {
                    all.push(add(a, 'container', siblings));
                    all.push(traverseChildren(a, siblings));
                }
                break;
            case 'widget':
                if (a instanceof Array) {
                    _.each(a, function(cont) {
                        all.push(add(cont, 'widget', siblings));
                    });
                } else {
                    all.push(add(a, 'widget', siblings));
                }
                break;
            default:
                break;
        }
    });
    return Q.all(all);
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
    util.spin.stop();
    util.err(chalk.red('bb export-pages: ') + (err.message || err.error));
}
function ok(r) {
    util.spin.stop();
    util.ok('Done.');
    return r;
}
