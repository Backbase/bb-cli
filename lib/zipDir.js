var _ = require('lodash');
var path = require('canonical-path');
var Q = require('q');
var fs = require('fs-extra-promise');
var tmp = require('tmp');

var JSZip = require('jszip');

// Zips a dir and saves it to temp dir
// then it returns temp zip path and cleanup function(if not called, it will cleanup on exit)
// strtPath - path to dir to zip
// exclude - items in dir to exclude
// replacements - object where key is zip path and value string of the file content
module.exports = function(startPath, excludes, replacements) {
    return new ZipDir(startPath, excludes, replacements);
};

function ZipDir(startPath, excludes, replacements) {
    this.dirPath = path.resolve(startPath);
    this.exclude = excludes || [];
    this.replace = replacements || {};
    this.zip = new JSZip();
    var that = this;

    return this.addDir(this.dirPath)
    .then(function() {
        var defer = Q.defer();
        tmp.file({postfix: '.zip'}, function (err, tmpPath) {
            if (err) defer.reject(err);
            var zipBuffer = that.zip.generate({type: 'nodebuffer', compression: 'DEFLATE'});
            defer.resolve(that.writeZip(tmpPath, zipBuffer));
        });
        return defer.promise;
    });
}

_.assign(ZipDir.prototype, {
    writeZip: function(zipPath, zipBuffer) {
        return fs.writeFileAsync(zipPath, zipBuffer)
        .then(function() {
            return zipPath;
        });
    },
    addDir: function(relPath) {
        var that = this;
        return fs.readdirAsync(relPath)
        .then(function(files) {
            return that.add(relPath, files)
            .then(function() {
                _.each(that.replace, function(fileContent, zipPath) {
                    that.zip.file(zipPath, fileContent);
                });
            });
        });
    },
    add: function(relPath, files) {
        var all = [];
        var that = this;
        _.each(files, function(fileName) {

            if (that.exclude.indexOf(fileName) !== -1) return;

            all.push(that.doLstat(relPath, fileName));
        });

        return Q.all(all);
    },
    doLstat: function(relPath, fileName) {
        var filePath = path.join(relPath, fileName);
        var that = this;
        return fs.isDirectoryAsync(filePath)
        .then(function(isDir) {
            if (isDir) {
                return that.addDir(filePath);
            } else {
                var zipPath = filePath.substr(that.dirPath.length + 1);
                if (that.replace[zipPath]) {
                    that.zip.file(zipPath, that.replace[zipPath]);
                    delete that.replace[zipPath];
                } else {
                    return fs.readFileAsync(filePath)
                    .then(function(fdata) {
                        that.zip.file(zipPath, fdata);
                    });
                }
            }
        });
    }
});
