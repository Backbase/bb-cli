var path = require('path');
var walk = require('walk');
var repos = require('../templates/repos.json');

var bbscaff = require('../lib/bbscaff');
var checkGithubConnectivity = require('./checkGithubConnectivity');

var templatesDir = path.join(__dirname, '..', 'templates');

var walker = walk.walk(templatesDir);

checkGithubConnectivity()
    .then(
        function () {
            var repoTemplates = [];
            walker
                .on("names", function (root, nodeNamesArray, next) {
                    var name = '';
                    if (nodeNamesArray.indexOf('bbscaff.js') !== -1) {
                        name = root.replace(templatesDir + '/', '');
                        if (repos[name]) {
                            repoTemplates.push({
                                repo: repos[name],
                                path: root
                            });
                        }
                    }
                    next();
                })
                .on("end", function () {
                    repoTemplates.forEach(function (data) {
                        bbscaff.fetchTemplate(data.repo, data.path, function (err) {
                            if (err) {
                                return console.error('Error trying to update template from git', err);
                            }
                        });
                    });
                });
        },
        function (err) {
            console.log('Error trying to update template from git', err);
        }
    );
