var Q = require('q');
var extract = require('extract-zip');
var fs = require('fs-extra-promise');
var tmp = require('promised-temp').track();
var os = require('os');
var chalk = require('chalk');

module.exports = function (src, dir, force) {
    var start;

    if (!dir) {
        start = getTempDir();
    } else {
        start = prepareDir(dir, force);
    }

    return start
    .then(function(destDir) {

        var defer = Q.defer();

        extract(src, {dir: destDir}, function(err) {
            if (err) defer.reject(err);
            else {
                defer.resolve(destDir + '/');
            }
        });

        return defer.promise;

    });
};

function getTempDir() {
    return tmp.mkdir({
        dir: os.tmpdir()
    });
}
function prepareDir(dir, force) {
    return fs.isDirectoryAsync()
    .then(function(isDir) {
        if (isDir) {
            if (force) {
                return fs.removeAsync(dir)
                .then(function() {
                    return Q(dir);
                });
            } else {
                throw new Error('Directory ' + chalk.gray(dir) + ' already exists.');
            }
        } else {
            return Q(dir);
        }
    });
}
