var bower = require('bower');
var Q = require('q');
var _ = require('lodash');
var out = {};

// returns local bower information object
// where keys are item names and values
// [version, dependecyList]
module.exports = function() {
    var defer = Q.defer();

    bower.commands.list({}, {offline: true})
    .on('end', function(result) {
        parseComponent(result);
        defer.resolve(out);
    })
    .on('error', function(e) {
        console.log('getBowerList error');
        defer.reject(e);
    });

    return defer.promise;
};

function parseComponent(result) {
    var pkg = result.pkgMeta;
    if (!pkg) {
        console.log('Cannot find bower.json for: ' + result.endpoint.name);
    }

    out[pkg.name] = {
        version: pkg._release || pkg.version || '',
        dependencies: pkg.dependencies
    };

    _.each(result.dependencies, function(depResult) {
        parseComponent(depResult);
    });
}

