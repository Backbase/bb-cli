var fs = require('fs-extra-promise');
var forms = require('../../lib/forms');
var Command = require('ronin').Command;


module.exports = Command.extend({
    options: forms.options,
    run: function (repository, project, branch, host, port, context, username, password, destination) {
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

        return forms.getConfig(opt).then(function(config) {
            return forms.getClient(config).then(function (mgmtService) {
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
        });
    }
});
