var chalk = require('chalk');
var fs = require('fs-extra-promise');
var forms = require('../../lib/forms');
var Command = require('ronin').Command;

module.exports = Command.extend({
    desc: 'Exports model from studio',
    options: forms.options,
    help: function(){
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [destination] [OPTIONS]';
        r += '\n\t Exports a form project.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -sH,  --studio <url>\t' + d('http://admin:welcome@localhost:8093/') +'\t\tStudio host.\n';
        r += '      -r,  --repository <string>\t' + '\tRepository from which to export the project.\n';
        r += '      -b,  --branch <string>\t' + '\t\tBranch name of the version to export.\n';
        r += '      -p,  --project <string>\t' + '\t\tName of the project to export.\n';

        return r;
    },
    run: function (repository, project, branch, studio, runtime, destination) {
        var opt = {
            studio: studio,
            runtime: runtime,
            repository: repository,
            project: project,
            branch: branch
        };

        return forms.getClient(opt).then(function (mgmtService) {
            return mgmtService.ExportProject({
                repository: repository,
                project: project,
                branch: branch
            }).then(function (response) {
                var buf = new Buffer(response.ExportProjectResult.Content, 'base64');
                var filename = destination ? destination : repository + '-' + branch + '-' + project + '.zip';

                return fs.writeFileAsync(filename, buf);
            });
        });
    }
});
