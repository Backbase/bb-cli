var _ = require('lodash');
var path = require('path');
var Q = require('q');
var fs = require('fs-extra-promise');
var path = require('path');
var tmp = require('promised-temp').track();

var JSZip = require('jszip');

// Zips a dir and saves it to temp dir
// then it returns temp zip path and cleanup function(if not called, it will cleanup on exit)
// strtPath - path to dir to zip
// exclude - items in dir to exclude
module.exports = function(strtPath, exclude) {
    var startPath = path.resolve(strtPath);
    var dirPath = path.resolve(startPath);
    var zip = new JSZip();

    return addDir(zip, dirPath, startPath, exclude || [])
    .then(function() {
        var zipBuffer = zip.generate({type: 'nodebuffer', compression: 'DEFLATE'});
        return tmp.open({
            dir: '/tmp/zipDir',
            suffix: '.zip'
        })
        .then(function(result) {
            return writeZip(result.path, zipBuffer);
        });
    });
};

function writeZip(path, zipBuffer) {
    return fs.writeFileAsync(path, zipBuffer)
    .then(function() {
        return {
            path: path,
            clean: function() {
                return tmp.cleanup();
            }
        };
    });
}

function addDir(zip, dirPath, startPath, exclude) {
    return fs.readdirAsync(dirPath)
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
    return fs.isDirectoryAsync(filePath)
    .then(function(isDir) {
        if (isDir) {
            return addDir(zip, filePath, startPath, exclude);
        } else {
            return fs.readFileAsync(filePath)
            .then(function(fdata) {
                zip.file(filePath.substr(startPath.length + 1), fdata);
            });
        }
    });
}
