var restUtils = require('../lib/restUtils');
var Command = require('ronin').Command;
var Q = require('q');
var fs = require('fs');
var readFile = Q.denodeify(fs.readFile);
var readDir = Q.denodeify(fs.readdir);
var _ = require('lodash');
var ask = Q.denodeify(require('asking').ask);
var config = require('../lib/config');
var chalk = require('chalk');
var bbrest, jxon, cfg;

module.exports = Command.extend({
    desc: 'Backbase CLI task automation.',
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Automates tasks during development of the components.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -p,  --prop\t\t\t\t\tSubmits changes of the widget propertie to the portal.\n';
        r += '      -f,  --file\t\t\t\t\tA file to target.\n';
        //r += '      -w,  --watch\t\t\t\t\tEnables watching for file change.\n';
        r += '      -v,  --verbose\t\t\t\t\tPrints detailed output.\n';
        /*
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb rest\t\t\t\t\t\tReturns portals defined on the server.\n';
        r += '      bb rest -t cache -T all -m delete\t\tDeletes all cache.\n';
        */
        r += '\n';
        return r;
    },

    options: {
        prop: {type: 'boolean', alias: 'p'},
        file: {type: 'string', alias: 'f'},
        watch: {type: 'boolean', alias: 'w'},
        verbose: {type: 'boolean', alias: 'v'}
    },

    run: function () {
        return config.getCommon(this.options)
        .then(function(r) {
            config = r.config;
            if (config.cli.prop) {
                return readDir(process.cwd())
                .then(function(files) {
                    return init(r, files);
                });
            }
        })
        .fail(function(e) {
            console.log(chalk.red('bb property'), e.toString());
        });
    }
});

function init(r, files) {
    bbrest = r.bbrest;
    jxon = r.jxon;
    cfg = r.config;
    var xmlFileName = cfg.cli.file || findXmlFile(files);
    var cType, cName, lps, ops;

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
        console.log(chalk.red('bb property'), 'xml file is not found in the current directory');
    }
    return f;
}
function getLocal(fName) {
    return readFile(fName)
    .then(function(s) {
        try {
            return jxon.stringToJs(s.toString());
        } catch(e) {
            console.log(chalk.red('bb property'), 'problem parsing xml file');
        }
    });
}
function getOrigin(cName, local) {
    return bbrest.catalog(cName).get()
    .then(function(r) {
        if (r.statusCode === 404 || r.error) {
            return ask("'" + cName + "' is not defined on the server. Submit model?", {default: 'Y'})
            .then(function(r) {
                if (r === 'Y') {
                    return bbrest.catalog().post(local)
                    .then(function(r) {
                        if (r.statusCode === 204) {
                            console.log(chalk.green('Done.'));
                            return false;
                        } else restUtils.onResponse(r, bbrest, cfg);
                    });
                } else {
                    return false;
                }
            });
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
