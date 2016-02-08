var _ = require('lodash');
var forms = require('../../lib/forms');
var Command = require('ronin').Command;

module.exports = Command.extend({
    options: forms.options,
    run: function (repository, project, branch, studio, runtime, item) {
        var opt = {
            repository: repository,
            project: project,
            branch: branch,
            studio: studio,
            runtime: runtime
        };

        switch (item) {
            case 'repositories':
                return forms.getClient(opt).then(function (mgmtService) {
                    mgmtService.GetRepositories({}).then(function (result) {
                        _.forEach(result.GetRepositoriesResult.string, function (result) {
                            console.log(result);
                        });
                    });
                });
            case 'projects':
                return forms.getClient(opt).then(function (mgmtService) {
                    mgmtService.GetProjects({
                        repository: repository,
                        branch: branch
                    }).then(function(result){
                        _.forEach(result.GetProjectsResult.string, function (result) {
                            console.log(result);
                        });
                    });
                });
            case 'branches':
                return forms.getClient(opt).then(function (mgmtService) {
                    mgmtService.GetBranches({
                        repository: repository
                    }).then(function (result) {
                        _.forEach(result.GetBranchesResult.string, function (result) {
                            console.log(result);
                        });
                    });
                });
            case 'shortcuts':
                return forms.getRuntimeClient(opt).then(function(client){
                    client
                        .get('/shortcuts')
                        .then(function(result){
                            console.log(result);
                        });
                });
            case 'runtime-projects':
                return forms.getRuntimeClient(opt).then(function(client){
                    client
                        .get('/projects')
                        .then(function(result){
                            console.log(result);
                        });
                });
            default:  throw new Error('Please specify item type.');
        }
    }
});
