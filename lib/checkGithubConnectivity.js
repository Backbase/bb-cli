var Q = require('q');
var dns = require('dns');

module.exports = function (repoUrl) {
    var deferred = Q.defer();
    dns.resolve('github.com', function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(repoUrl);
        }
    });
    return deferred.promise;
};
