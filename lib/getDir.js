var Q = require('q');
var fs = require('fs-extra-promise');
var path = require('path');
var _ = require('lodash');

// returns list of items in dir
// file names
module.exports = function(dirPath, exclude) {
    exclude = exclude || [];
    dirPath = path.resolve(dirPath);
    return fs.readdirAsync(dirPath)
    .then(_.partial(parseItems, dirPath, _, exclude))
    .catch(function() {
        var name = path.parse(dirPath).base;
        console.log(name + ' problem parsing dir. getDir module. Path: ' + dirPath);
    });
};

function parseItems(dirPath, fileNames, exclude) {
    var all = {
        dirs: [],
        files: []
    };
    var promises = [];
    _.each(fileNames, function(fileName) {
        if (exclude.indexOf(path.parse(fileName).base) !== -1) return;
        promises.push(addItem(all, path.join(dirPath, fileName)));
    });
    return Q.all(promises)
    .then(function() {
        return all;
    });
}
function addItem(all, itemPath) {
    return fs.lstatAsync(itemPath)
    .then(function(stat) {
        if (stat.isFile()) {
            all.files.push(itemPath);
        } else if (stat.isDirectory()) {
            all.dirs.push(itemPath);
        }
    });
}
