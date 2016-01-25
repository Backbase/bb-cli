var forms = require('../../lib/forms');
var Command = require('ronin').Command;
var fs = require('fs');


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

        forms.getConfig(opt).then(function(config) {
            forms.getClient(config).then(function (mgmtService) {
                mgmtService.ExportProject({
                    repository: repository,
                    project: project,
                    branch: branch
                }, function (err, response) {
                    if (err)
                        throw new Error(err);

                    var buf = new Buffer(response.ExportProjectResult.Content, 'base64');
                    var filename = destination ? destination : repository + '-' + branch + '-' + project + '.zip';

                    fs.writeFileSync(filename, buf);
                });
            });
        });
    }
});
