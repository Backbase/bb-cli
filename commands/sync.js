var restUtils = require('../lib/restUtils');
var Command = require('ronin').Command;
var Q = require('q');
var fs = require('fs');
var readFile = Q.denodeify(fs.readFile);
var writeFile = Q.denodeify(fs.writeFile);
var readDir = Q.denodeify(fs.readdir);
var _ = require('lodash');
var inquirer = require('inquirer');
var config = require('../lib/config');
var chalk = require('chalk');
var formattor = require('formattor');
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
        r += '      -s,  --save <string>\t' + d('') + '\t\t\t Name of the server item which model should be exported to a file.\n';
        r += '      -y,  --yes <string>\t' + d('') + '\t\t Disable interactive mode, answer all questions with yes.\n';
        //r += '      -w,  --watch <boolean>\t' + d('false') + '\t\t\t Enables watching for file change.\n';
        r += '      -v,  --verbose\t\t' + d('false') + '\t\t\t Prints detailed output.\n';
        return r;
    },

    options: {
        file: {type: 'string', alias: 'f'},
        context: {type: 'context', alias: 'c'},
        save: {type: 'string', alias: 's'},
        yes: {type: 'boolean', alias: 'y'},
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


var propsToKeep = {
    name: true,
    contextItemName: true,
    extendedItemName: true,
    properties: true
};
function init(r, files) {
    bbrest = r.bbrest;
    jxon = r.jxon;
    cfg = r.config;
    var xmlFileName = cfg.cli.file || findXmlFile(files);

    if (cfg.cli.context) bbrest.config.context = cfg.cli.context;

    // if there is no xml file, get model from server and save it
    if (files.indexOf(xmlFileName) === -1) {
        // if the name of the item to be saved is defined...
        if (cfg.cli.save) return saveFile(cfg.cli.file || 'model.xml', cfg.cli.save);
        // otherwise read bower
        else if (files.indexOf('bower.json') !== -1) {
            return readFile('bower.json')
            .then(function(result) {
                return saveFile(cfg.cli.file || 'model.xml', JSON.parse(result).name);
            })
            .fail(function() {
                console.log('Insufficient data to write model xml file. bower.json read failed');
            });
        } else {
            var defer = Q.defer();
            defer.reject();
            console.log('Insufficient data to write model xml file.');
            return defer.promise;
        }
    // otherwise submit existing file
    } else {
        return submitFile(xmlFileName);
    }

}

function findXmlFile(files) {
    var f, i;
    for (i = 0; i < files.length; i++) {
        if (files[i].substr(files[i].lastIndexOf('.')) === '.xml') {
            f = files[i];
            break;
        }
    }
    return f;
}

function saveFile(fname, itemName) {
    var defer = Q.defer();

    var func = function(answers) {
        if (answers.saveModel) {
            defer.resolve(writeModelFile(fname, itemName));
        } else {
            defer.reject('Saving aborted.');
        }
    };

    if (cfg.cli.yes) func({saveModel: true});
    else {
        inquirer.prompt([{
            message: "'" + fname + "' does not exist. Create one?",
            name: 'saveModel',
            type: 'confirm'
        }], func);
    }
    return defer.promise;
}

function submitFile(xmlFileName) {
    var itemType, itemName, localProps, serverProps;
    return getLocal(xmlFileName)
    .then(function(local) {
        var keys = _.keys(local.catalog);
        if (keys.length !== 1) console.log(chalk.yellow('Warning'), 'Only one component per catalog is allowed. Found:', keys);
        itemType = keys[0];
        itemName = local.catalog[itemType].name;
        localProps = local.catalog[itemType].properties.property;

        localProps.sort(sortByName);

        return getOrigin(itemName, local)
        .then(function(origin) {
            // if item is not defined, r is false
            if (origin === false) return true;
            serverProps = origin.catalog[keys[0]].properties.property;

            //serverProps = _.filter(serverProps, removeEmpty);
            serverProps.sort(sortByName);

            compare(localProps, serverProps, local.catalog.widget.name);

            return bbrest.catalog().put(local)
            .then(function(r) {
                restUtils.onResponse(r, bbrest, cfg.cli);
            });
        });
    });
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

function getOrigin(itemName, local) {
    return bbrest.catalog(itemName).get()
    .then(function(r) {
        if (r.statusCode === 404 || r.error) {
            var deferred = Q.defer();

            var doSubmit = function(answers) {
                if (answers.submitModel) {
                    bbrest.catalog().post(local)
                    .then(function (r) {
                        if (r.statusCode === 204) {
                            console.log(chalk.green('Submitted.'));
                        } else restUtils.onResponse(r, bbrest, cfg.cli);

                        deferred.resolve(true);
                    });
                } else {
                    deferred.resolve(false);
                }
            };

            if (cfg.cli.yes) return doSubmit({submitModel: true});
            else {
                inquirer.prompt([{
                    message: "'" + itemName + "' is not defined on the server. Submit model?",
                    name: 'submitModel',
                    type: 'confirm'
                }], doSubmit);
            }

            return deferred.promise;
        } else {
            return jxon.stringToJs(_.unescape(r.body));
        }
    });
}


function compare(localProps, serverProps, wname) {
    var lKeys = _.pluck(localProps, '$name');
    var oKeys = _.pluck(serverProps, '$name');
    var toDelete = _.difference(oKeys, lKeys);

    for (var ov, i = 0; i < toDelete.length; i++) {
        ov = _.find(serverProps, {$name: toDelete[i]});

        // Skip g:preferences fields, since they are not in xml
        if (ov.$viewHint && ov.$viewHint.indexOf('select-one') > -1) return;

        if (ov.$itemName !== wname) console.log(chalk.gray(ov.$name) + ' property ' + chalk.red('can not') + ' be removed because it is shared.');
        else console.log(chalk.gray(ov.$name) + ' property will be removed. ');

        ov.$markedForDeletion = true;
        localProps.push(ov);
    }
}

function writeModelFile(fname, itemName) {
    return bbrest.catalog(itemName).get()
    .then(function(res) {
        var jx = jxon.stringToJs(_.unescape(res.body));
        delete (jx.catalog.$totalSize);
        for (var k in jx.catalog.widget) if (!propsToKeep[k]) delete (jx.catalog.widget[k]);
        jx = '<?xml version="1.0" encoding="UTF-8"?>' + jxon.jsToString(jx);
        jx = formattor(jx, {method: 'xml'});
        return writeFile(fname, jx)
        .then(function() {
            console.log(fname + ' saved.');
        });
    })
    .catch(function(e) {
        console.log(e);
    });
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
