var path = require('path');
var repos = require('../templates/repos.json');
var walker = require('../lib/walk').walker;
var bbscaff = require('../lib/bbscaff');
var updateTemplatesOnDemand = require('./updateTemplatesOnDemand');

var templatesDir = path.join(__dirname, '..', 'templates');

var key;
var getOnProgressHandler = function (repoTemplates) {
    return function onProgress(data) {
        var name = '';
        var stat = data.stat;
        var root = data.file;
        if (stat.isDirectory()) {
            name = root.replace(templatesDir + '/', '');
            if (repos[name]) {
                repoTemplates.push({
                    repo: repos[name],
                    path: root
                });
            }
        }
    };
};
var getOnSuccessHandler = function (repoTemplates) {
    return function onSuccess () {
        repoTemplates.forEach(function (data) {
            bbscaff.fetchTemplate(data.repo, data.path, function (err) {
                if (err) {
                    return console.error('Error trying to update template from git', err);
                }
            });
        });
    };
};
var onErrorHandler = function (err) {
    console.log('Error trying to update template from git', err);
};
var runTraverse = function () {
    var repoTemplates = [];
    walker
        .run()
        .progress(getOnProgressHandler(repoTemplates))
        .then(
            getOnSuccessHandler(repoTemplates),
            onErrorHandler
        );
};

for (key in repos) {
    if (repos.hasOwnProperty(key)) {
        updateTemplatesOnDemand(repos[key], path.join(templatesDir, key), true)
            .then(
                runTraverse,
                onErrorHandler
            );
    }
}
