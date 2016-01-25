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

        forms.getConfig(opt).then(function(config){
            forms.getClient(config).then(function (mgmtService) {
                switch (item) {
                    case 'repositories':
                        mgmtService.GetRepositories({}, function (err, result) {
                            if (err)
                                throw new Error(err);

                            _.forEach(result.GetRepositoriesResult.string, function (result) {
                                console.log(result);
                            });
                        });
                        break;
                    case 'projects':
                        mgmtService.GetProjects({
                            repository: repository,
                            branch: branch
                        }, function (err, result) {
                            if (err)
                                throw new Error(err);

                            _.forEach(result.GetProjectsResult.string, function (result) {
                                console.log(result);
                            });
                        });
                        break;
                    case 'branches':
                        mgmtService.GetBranches({
                            repository: repository
                        }, function (err, result) {
                            if (err)
                                throw new Error(err);

                            _.forEach(result.GetBranchesResult.string, function (result) {
                                console.log(result);
                            });
                        });
                        break;
                    case 'flows':
                        mgmtService.GetRepositories({}, function (err, result) {
                            if (err)
                                throw new Error(err);

                            _.forEach(result.GetRepositoriesResult.string, function (result) {
                                console.log(result);
                            });
                        });
                        break;
                    default:  util.err('Please specify item type.');
                }
            });
        });
    }
});
