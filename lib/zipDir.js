var _ = require('lodash');
var path = require('path');
var Q = require('q');
var fs = require('fs-extra');
var readFile = Q.denodeify(fs.readFile);
var writeFile = Q.denodeify(fs.writeFile);
var readDir = Q.denodeify(fs.readdir);
var lstat = Q.denodeify(fs.lstat);
var path = require('path');
var tmp = require('tmp');
var tmpDir = Q.denodeify(tmp.dir);

var JSZip = require('jszip');

module.exports = function(dirPath, exclude) {
    var zip = new JSZip();

    return addDir(zip, dirPath, exclude)
    .then(function() {
        var zipBuffer = zip.generate({type: 'nodebuffer'});
        return tmpDir()
        .then(function(r) {
            var pth = path.resolve(r[0], 'import.zip');
            return writeFile(pth, zipBuffer)
            .then(function() {
                return {
                    path: pth,
                    clean: r[1]
                };
            });
        });
    });
};

function addDir(zip, dirPath, exclude) {
    return readDir(dirPath)
    .then(function(files) {
        return add(zip, dirPath, files, exclude);
    });
}

// files - file path array
function add(zip, dirPath, files, exclude) {
    var all = [];
    var filePath;
    _.each(files, function(fileName) {

        if (exclude.indexOf(fileName) !== -1) return;
        filePath = path.join(dirPath, fileName);

        all.push(doLstat(zip, filePath, exclude));
    });

    return Q.all(all);

}

function doLstat(zip, filePath, exclude) {
    return lstat(filePath)
    .then(function(stat) {
        if (stat.isFile()) {
            return readFile(filePath)
            .then(function(fdata) {
                zip.file(filePath, fdata);
            });
        } else if (stat.isDirectory()) {
            return addDir(zip, filePath, exclude);
        }
    });
}
