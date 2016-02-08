var fs = require('fs-extra-promise');
var forms = require('../../lib/forms');
var Command = require('ronin').Command;


module.exports = Command.extend({
    options: forms.options,
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
