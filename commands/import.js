var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var clui = require('clui');
var _ = require('lodash');
var loading = new clui.Spinner('Please wait...');
var Q = require('q');
var fs = require('fs-extra');
var readFile = Q.denodeify(fs.readFile);
var writeFile = Q.denodeify(fs.writeFile);
var remove = Q.denodeify(fs.remove);
var copy = Q.denodeify(fs.copy);
var readDir = Q.denodeify(fs.readdir);
var mkdirp = Q.denodeify(fs.mkdirp);
var lstat = Q.denodeify(fs.lstat);
var path = require('path');
var os = require('os');

var JSZip = require('jszip');

var Command = require('ronin').Command;

var bbrest, jxon, cfg;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Imports portal.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description';
        r += '      -t,  --target <string>\t\t' + '\t\tFile or dir to import.\n';

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
        r += '      bb export -s accounts.zip --type widget --name accounts -C [BBHOST] -k\tExports widget and prettify/chunk the model in accounts dir';
        return r;
    },

    options: {
        target: {type: 'string', alias: 't'}
    },

    run: function () {

        loading.start();
        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;

            if (!cfg.target) return error(new Error('Target is not defined.'));

            return lstat(cfg.target)
            .then(function(stats) {
                if (stats.isDirectory()) {
                    return importDir();
                } else if (stats.isFile()) {
                    var pth = path.parse(cfg.target);
                    if (pth.ext === '.xml') return bbrest.import().post(cfg.target);
                    else if (pth.ext === '.zip') return bbrest.import().file(cfg.target).post();
                    throw new Error('File must be xml or zip archive');
                }
                throw new Error('Target is not directory or file.');
            })
            .then(function(bbr) {
                if (bbr.error) {
                    var emsg = jxon.stringToJs(bbr.body);
                    emsg = emsg.errorMessage || emsg.importErrorMessage || {message: 'Unknown import message.'}
                    throw new Error(emsg.message);
                } else ok(bbr);
            })
            .catch(function(err) {
                if (err.code === 'ENOENT') return error(new Error('Target does not exist.'));
                return error(err);
            });


        });

    }

});

function error(err) {
    loading.stop();
    util.err(chalk.red('bb export: ') + (err.message || err.error));
}
function ok(r) {
    loading.stop();
    util.ok('Importing ' + chalk.green(cfg.target) + '. Done.');
    return r;
}

function importDir() {
    return readFile(path.resolve(cfg.target, 'metadata.xml'))
    .then(function(r) {
        var mj = jxon.stringToJs(r.toString());
        return readDir(cfg.target)
        .then(function(d) {
            var xmls = {};
            var all = [];
            var noneXmlFiles = [];
            _.each(d, function(v) {
                var pth = path.parse(v);
                if (pth.ext === '.xml') {
                    if (pth.name !== 'metadata') {
                        all.push(readFile(path.resolve(cfg.target, v)).then(function(s) {
                            xmls[_.camelCase(pth.name)] = s.toString();
                        }));
                    }
                } else {
                    noneXmlFiles.push(path.resolve(cfg.target, v));
                }
            });
            return Q.all(all)
            .then(function() {
                var finalXml = '<exportBundle>';
                var order = mj.backbaseArchiveDescriptor.bbexport.order.split(',');
                _.each(order, function(f) {
                    if (xmls[f]) finalXml += xmls[f];
                    else finalXml += ('<' + f + '/>');
                });
                finalXml += '</exportBundle>';

                delete mj.backbaseArchiveDescriptor.bbexport;
                
                if (noneXmlFiles.length) {
                    return packAll(mj, finalXml, noneXmlFiles)
                    .then(function(zip) {
                        var pth = path.resolve(path.parse(cfg.target).dir, '_$import-temp$_.zip');
                        return writeFile(pth, zip)
                        .then(function() {
                            return bbrest.import().file(pth).post();
                        })
                        .fin(function() {
                            remove(pth);
                        });
                    });
                } else {
                    return bbrest.import().post(jxon.stringToJs(finalXml));
                }
            });
        });
    });
}

function packAll(metadata, xml, other) {
    metadata.backbaseArchiveDescriptor.packageId = 'content';

    var zip = new JSZip();
    var all = [];

    zip.file('metadata.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + jxon.jsToString(metadata));
    zip.file('content/portalserver.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + xml);
    _.each(other, function(v) {
        all.push(readFile(v).then(function(fdata) {
            var pth = path.parse(v);
            zip.file('content/' + pth.base, fdata);
        }));
    });

    return Q.all(all)
    .then(function() {
        return zip.generate({type: 'nodebuffer'});
    });
}
