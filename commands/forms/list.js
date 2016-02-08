var _ = require('lodash');
var chalk = require('chalk');
var forms = require('../../lib/forms');
var Command = require('ronin').Command;

module.exports = Command.extend({
    desc: 'List items in a CLI friendly way',
    options: forms.options,
    help: function(){
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS] item-type';
        r += '\n\t Exports a form project.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -sH,  --studio <url>\t' + d('http://admin:welcome@localhost:8093/') +'\t\tStudio host.\n';
        r += '      -rH,  --runtime <url>\t' + d('http://admin:admin@localhost:8086/forms-runtime') +'\t\Runtime host.\n';
        r += '      -r,  --repository <string>\t' + '\tRepository from which to export the project.\n';
        r += '      -b,  --branch <string>\t' + '\t\tBranch name of the version to export.\n';
        r += '      -p,  --project <string>\t' + '\t\tName of the project to export.\n';
        r += '\n  '+ title('Item types')+'\n';
        r += '\trepositories, projects, branches, shortcuts, runtime-projects';

        return r;
    },
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
