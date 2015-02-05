var restUtils = require('../restUtils');
var Q = require('q'),
    fs = require('fs'),
    chalk = require('chalk'),
    _ = require('lodash'),
    readFile = Q.denodeify(fs.readFile),
    readDir = Q.denodeify(fs.readdir),
    writeFile = Q.denodeify(fs.writeFile),
    ask = Q.denodeify(require('asking').ask),
    util = require('../util'),
    bbrest, jxon, cfg;

var reqProps = [];

function doError(txt) {
    //console.log(chalk.red('ERROR'), txt);
    util.err.apply(this, arguments);
    throw Error();
}

exports.init = function (bbr, jx, cfga, files) {
    bbrest = bbr;
    jxon = jx;
    cfg = cfga;
    var xmlFileName = cfg.file || findXmlFile(files);
    var cType, cName, lps, ops;

    getLocal(xmlFileName)
    .then(function(local) {
        var keys = _.keys(local.catalog);
        if (keys.length !== 1) doError('Only one component per catalog is allowed. Found:', keys);
        cType = keys[0];
        cName = local.catalog[keys[0]].name;
        lps = local.catalog[keys[0]].properties.property;

        lps.sort(sortByName);

        return getOrigin(cName, local)
        .then(function(origin) {
            ops = origin.catalog[keys[0]].properties.property;

            ops = _.filter(ops, removeEmpty);
            ops.sort(sortByName);

            compare(lps, ops);
            
            return bbrest.catalog().put(local)
            .then(function(r) {
                restUtils.onResponse(r, bbrest, cfg);
            });
            
        });
    })
    .fail(function(e) {
        doError(e);
    });

}

function findXmlFile(files) {
    var f;
    for (i = 0; i < files.length; i++) {
        if (files[i].substr(files[i].lastIndexOf('.')) === '.xml') {
            f = files[i];
            break;
        }
    }
    if (!f) {
        doError('xml file is not found in the current directory');
    }
    return f;
}
function getLocal(fName) {
    return readFile(fName)
    .then(function(s) {
        try {
            return jxon.stringToJs(s.toString());
        } catch(e) {
            doError('problem parsing', fName);
        }
    });
}
function getOrigin(cName, local) {
    return bbrest.catalog(cName).get()
    .then(function(r) {
        if (r.statusCode === 404) {
            return ask("'" + cName + "' is not defined on the server. Submit?", {default: 'Y'})
            .then(function(r) {
                if (r === 'Y') {
                    return bbrest.catalog().post(local)
                    .then(function(r) {
                        if (r.statusCode === 204) {
                            return ask('Add to portal catalog?', {default: 'Y'})
                            .then(function(r) {
                                if (r === 'Y') {
                                    return bbrest.catalog(true).post(local)
                                    .then(function(r) {
                                        if (r.statusCode === 204) util.ok('Done.');
                                        else restUtils.onResponse(r, bbrest, cfg);
                                    });
                                }
                            })
                        } else restUtils.onResponse(r, bbrest, cfg);
                    });
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
function addPropDefaults(v) {
    var o = _.assign({
        $readonly: false,
        $manageable: true
    }, v);
    _.assign(v, o);
}
function sortByName(a, b) {
    if (a.$name > b.$name) return 1;
    else if (a.$name < b.$name) return -1;
    else return 0;
}
function removeEmpty(v) {
    return v.value._ !== undefined;
}

