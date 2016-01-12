var Q = require('q');
var dns = require('dns');

module.exports = function () {
    var deferred = Q.defer();
    dns.resolve('bitbucket.org', function (err) {
        if (err) {
            console.log('Bitbucket can not be reached.', 'Check your internet connection.', 'Fallback to local version will be applied.');
            deferred.reject(err);
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise;
};
