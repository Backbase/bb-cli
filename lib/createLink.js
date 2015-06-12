// crossplatform createLink borrowed from bower
// https://github.com/bower/bower/blob/master/lib/util/createLink.js
var fs = require('fs-extra');
var path = require('path');
var Q = require('q');

var isWin = process.platform === 'win32';

function createLink(src, dst, type) {
    var dstDir = path.dirname(dst);

    // Create directory
    return Q.nfcall(fs.mkdirp, dstDir)
    // Check if source exists
    .then(function () {
        return Q.nfcall(fs.stat, src)
        .fail(function (error) {
            if (error.code === 'ENOENT') {
                throw new Error(['Failed to create link to ' + path.basename(src), 'ENOENT',
                     src + ' does not exist or points to a non-existent file'].join('\n')
                );
            }

            throw error;
        });
    })
    // Create symlink
    .then(function (stat) {
        type = type || (stat.isDirectory() ? 'dir' : 'file');

        return Q.nfcall(fs.symlink, src, dst, type)
        .fail(function (err) {
            if (!isWin || err.code !== 'EPERM') {
                throw err;
            }

            // Try with type "junction" on Windows
            // Junctions behave equally to true symlinks and can be created in
            // non elevated terminal (well, not always..)
            return Q.nfcall(fs.symlink, src, dst, 'junction')
            .fail(function (err) {
                throw new Error(['Unable to create link to ' + path.basename(src), err.code,
                    err.message.trim() + '\n\nTry running this command in an elevated terminal (run as root/administrator).'].join('\n')
                );
            });
        });
    });
}

module.exports = createLink;
