var restUtils = require('../lib/restUtils');
var Command = require('ronin').Command;
var Q = require('q');
var fs = require('fs');
var readFile = Q.denodeify(fs.readFile);
var readDir = Q.denodeify(fs.readdir);
var _ = require('lodash');
var inquirer = require('inquirer');
var config = require('../lib/config');
var chalk = require('chalk');
var bbrest, jxon, cfg;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Syncs local XML model with remote.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -f,  --file <string>\t' + d('first xml file') + '\t\t A file to target.\n';
        r += '      -c,  --context <string>\t' + d('portalserver') + '\t\t Portal server context (for other options use `.bbrc`).\n';
        //r += '      -w,  --watch <boolean>\t' + d('false') + '\t\t\t Enables watching for file change.\n';
        r += '      -v,  --verbose\t\t' + d('false') + '\t\t\t Prints detailed output.\n';
        return r;
    },

    options: {
        file: {type: 'string', alias: 'f'},
        context: {type: 'context', alias: 'c'},
        //watch: {type: 'boolean', alias: 'w'},
        verbose: {type: 'boolean', alias: 'v'}
    },

    run: function () {
        return config.getCommon(this.options)
        .then(function(r) {
            return readDir(process.cwd())
                .then(function(files) {
                    return init(r, files);
                });
        })
        .fail(function(e) {
            console.log(chalk.red('bb prop error: '), e);
        });
    }
});

function init(r, files) {
    bbrest = r.bbrest;
    jxon = r.jxon;
    cfg = r.config;
    var xmlFileName = cfg.cli.file || findXmlFile(files);
    var cType, cName, lps, ops;

    if (cfg.cli.context) bbrest.config.context = cfg.cli.context;

    return getLocal(xmlFileName)
    .then(function(local) {
        var keys = _.keys(local.catalog);
        if (keys.length !== 1) console.log(chalk.yellow('Warning'), 'Only one component per catalog is allowed. Found:', keys);
        cType = keys[0];
        cName = local.catalog[keys[0]].name;
        lps = local.catalog[keys[0]].properties.property;

        lps.sort(sortByName);

        return getOrigin(cName, local)
        .then(function(origin) {
            // if item is not defined, r is false
            if (origin === false) return true;
            ops = origin.catalog[keys[0]].properties.property;

            ops = _.filter(ops, removeEmpty);
            ops.sort(sortByName);

            compare(lps, ops);

            return bbrest.catalog().put(local)
            .then(function(r) {
                restUtils.onResponse(r, bbrest, cfg.cli);
            });
        });
    });
}

function findXmlFile(files) {
    var f, i;
    for (i = 0; i < files.length; i++) {
        if (files[i].substr(files[i].lastIndexOf('.')) === '.xml') {
            f = files[i];
            break;
        }
    }
    if (!f) {
        console.log(chalk.red('bb prop error:'), 'xml file is not found in the current directory');
    }
    return f;
}

function getLocal(fName) {
    return readFile(fName)
    .then(function(s) {
        try {
            return jxon.stringToJs(s.toString());
        } catch(e) {
            console.log(chalk.red('bb prop error:'), 'problem parsing xml file');
        }
    });
}

function getOrigin(cName, local) {
    return bbrest.catalog(cName).get()
        .then(function(r) {
            if (r.statusCode === 404 || r.error) {
                var deferred = Q.defer();

                inquirer.prompt([{
                    message: "'" + cName + "' is not defined on the server. Submit model?",
                    name: 'submitModel',
                    type: 'confirm'
                }], function(answers){
                    if (answers.submitModel) {
                        bbrest.catalog().post(local)
                            .then(function (r) {
                                if (r.statusCode === 204) {
                                    console.log(chalk.green('Submitted.'));
                                } else restUtils.onResponse(r, bbrest, cfg.cli);

                                deferred.resolve(false);
                            });
                    } else {
                        deferred.resolve(false);
                    }
                });

                return deferred.promise;
            } else {
                return jxon.stringToJs(_.unescape(r.body));
            }
        });
}

function compare(lps, ops) {
    var lKeys = _.pluck(lps, '$name');
    var oKeys = _.pluck(ops, '$name');
    var toDelete = _.difference(oKeys, lKeys);

    for (var ov, i = 0; i < toDelete.length; i++) {
        ov = _.find(ops, {$name: toDelete[i]});

        // Skip g:preferences fields, since they are not in xml
        if (ov.$viewHint.indexOf("select-one") > -1) return;

        ov.$markedForDeletion = true;
        lps.push(ov);
    }
}

/*
function addPropDefaults(v) {
    var o = _.assign({
        $readonly: false,
        $manageable: true
    }, v);
    _.assign(v, o);
}
*/

function sortByName(a, b) {
    if (a.$name > b.$name) return 1;
    else if (a.$name < b.$name) return -1;
    else return 0;
}

function removeEmpty(v) {
    return v.value._ !== undefined;
}
