var Q = require('q');
var bbscaff = require('../lib/bbscaff');
var checkGithubConnectivity = require('../lib/checkGithubConnectivity');

module.exports = function (repo, target, forceUpdate) {
    var deferred = Q.defer();
    checkGithubConnectivity()
        .then(
            function () {
                if (!forceUpdate) {
                    bbscaff.prompt([
                            {
                                type: 'input',
                                name: 'update',
                                message: 'There is connectivity available to download a new version of the template. Do you want to update it?',
                                default: 'N'
                            }
                        ])
                        .then(
                            function (input) {
                                if (!forceUpdate && input.update.toUpperCase() === 'N') {
                                    deferred.resolve(false);
                                } else {
                                    console.log('Updating template.');
                                    deferred.resolve(true);
                                }
                            },
                            function (error) {
                                deferred.reject(error);
                            }
                        );
                } else {
                    console.log('Updating template from repository:', repo);
                    bbscaff.fetchTemplate(repo, target, function (err) {
                        if (err) {
                            return console.error('Error trying to update template from git', err);
                        }
                    });
                    deferred.resolve(true);
                }

            },
            function (err) {
                deferred.reject(err);
            });
    return deferred.promise;
};
