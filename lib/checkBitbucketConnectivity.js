var Q = require('q');
var dns = require('dns');

module.exports = function () {
    var deferred = Q.defer();
    dns.resolve('bitbucket.org', function (err) {
        if (err) {
            console.log('Using template\'s local version.');
            deferred.reject(err);
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise;
};
