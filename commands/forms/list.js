var _ = require('lodash');
var util = require('../../lib/util');
var forms = require('../../lib/forms');
var Command = require('ronin').Command;

module.exports = Command.extend({
    options: forms.options,
    run: function (repository, project, branch, host, port, context, username, password, item) {
        var opt = {
            repository: repository,
            project: project,
            branch: branch,
            host: host,
            port: port,
            context: context,
            username: username,
            password: password
        };

        return forms.getConfig(opt).then(function(config){
            return forms.getClient(config).then(function (mgmtService) {
                switch (item) {
                    case 'repositories':
                        return mgmtService.GetRepositories({}).then(function (result) {
                                _.forEach(result.GetRepositoriesResult.string, function (result) {
                                    console.log(result);
                                });
                            });
                    case 'projects':
                        return mgmtService.GetProjects({
                            repository: repository,
                            branch: branch
                        }).then(function(result){
                            _.forEach(result.GetProjectsResult.string, function (result) {
                                console.log(result);
                            });
                        });
                    case 'branches':
                        return mgmtService.GetBranches({
                            repository: repository
                        }).then(function (result) {
                            _.forEach(result.GetBranchesResult.string, function (result) {
                                console.log(result);
                            });
                        });
                    default:  throw new Error('Please specify item type.');
                }
            });
        });
    }
});
