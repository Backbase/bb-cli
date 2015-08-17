var _ = require('lodash');
var path = require('path');
var Q = require('q');
var fs = require('fs-extra-promise');
var readFile = Q.denodeify(fs.readFile);
var writeFile = Q.denodeify(fs.writeFile);
var readDir = Q.denodeify(fs.readdir);
var lstat = Q.denodeify(fs.lstat);
var remove = Q.denodeify(fs.remove);
var path = require('path');
var tmp = require('tmp');
var tmpDir = Q.denodeify(tmp.dir);

var JSZip = require('jszip');

module.exports = function(strtPath, exclude) {
    var startPath = path.resolve(strtPath);
    var dirPath = path.resolve(startPath);
    var zip = new JSZip();

    return addDir(zip, dirPath, startPath, exclude)
    .then(function() {
        var zipBuffer = zip.generate({type: 'nodebuffer'});
        return tmpDir()
        .then(function(r) {
            var pth = path.resolve(r[0], 'import.zip');
            return writeFile(pth, zipBuffer)
            .then(function() {
                return {
                    path: pth,
                    clean: function() {
                        return remove(pth)
                        .then(function() {
                            r[1]();
                        });
                    }
                };
            });
        });
    });
};

function addDir(zip, dirPath, startPath, exclude) {
    return readDir(dirPath)
    .then(function(files) {
        return add(zip, dirPath, files, startPath, exclude);
    });
}

function add(zip, dirPath, files, startPath, exclude) {
    var all = [];
    var filePath;
    _.each(files, function(fileName) {

        if (exclude.indexOf(fileName) !== -1) return;
        filePath = path.join(dirPath, fileName);

        all.push(doLstat(zip, filePath, startPath, exclude));
    });

    return Q.all(all);

}

function doLstat(zip, filePath, startPath, exclude) {
    return lstat(filePath)
    .then(function(stat) {
        if (stat.isFile()) {
            return readFile(filePath)
            .then(function(fdata) {
                zip.file(filePath.substr(startPath.length + 1), fdata);
            });
        } else if (stat.isDirectory()) {
            return addDir(zip, filePath, startPath, exclude);
        }
    });
}
