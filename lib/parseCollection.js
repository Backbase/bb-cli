// reads all bower component dirs
// returns collection with path, name and bower.json content of each

var BowerConfig = require('bower-config');
var getDir = require('../lib/getDir');
var path = require('path');
var Q = require('q');
var _ = require('lodash');
var getBowerList = require('../lib/getBowerList');
var modelXml = require('../lib/modelXml');
var orderDeps = require('../lib/orderDependencies');
var jxon, auto;

// startPath - path of the dir containing bower.json of the collection
// exclude - names of dirs and files to be ignored by parser
// auto - if true, create model.xml when missing and add version and description
// return array will be sorted on dependency priority
module.exports = function(startPath, exclude, aut, jxo) {
    startPath = path.resolve(startPath);
    auto = aut;
    jxon = jxo;
    var bowerDir = BowerConfig.create(startPath).load().toObject().directory;
    var mainPath = path.resolve(startPath, bowerDir);

    return getDir(mainPath, exclude)
    .then(readModelXmls)
    .then(reorder);

};

function readModelXmls(dirContent) {
    var all = [];

    _.each(dirContent.dirs, function(dirPath) {
        var result = {path: dirPath, name: path.parse(dirPath).base};
        all.push(
            getModel(result)
        );
    });
    return Q.all(all);
}

function getModel(result) {
    result.model = modelXml(jxon);
    return result.model.read(path.resolve(result.path, 'model.xml'))
    .then(function() {
        return result;
    })
    .catch(function(err) {
        if (err.code === 'ENOENT') {
            if (auto) {
                result.model.createFeature(result.name);
            } else {
                console.log('Can\'t find ' + result.name + '/model.xml Use --auto flag?');
            }
            return result;
        } else {
            throw new Error(result.name + ': error reading model.xml');
        }
    });
}


function reorder(result) {
    return getBowerList()
    .then(function(list) {
        var flat = {};
        _.each(list, function(comp, name) {
            if (!comp.dependencies) return;
            var keys = _.keys(comp.dependencies);
            flat[name] = keys;
        });
        _.each(flat, function(deps, depName) {
            var alldeps = [];
            _.each(deps, function(key) {
                alldeps = _.union(alldeps, flat[key]);
            });
            flat[depName] = _.union(deps, alldeps);
        });
        var order = orderDeps(flat);
        var reordered = [];
        _.each(order, function(name) {
            if (name.indexOf('collection') === 0) return;
            var comp = _.where(result, {name: name})[0];
            if (!comp) throw new Error('\'' + name + '\' is not valid bower_component');
            comp.version = list[name].version;
            reordered.push(comp);
        });
        return reordered;
    });
}



