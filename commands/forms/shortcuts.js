var url = require('url');
var _ = require('lodash');
var temp = require('temp');
var opener = require('opener');
var fs = require('fs-extra-promise');
var forms = require('../../lib/forms');
var Command = require('ronin').Command;

module.exports = Command.extend({
    options: forms.options,
    run: function (repository, project, branch, studio, runtime) {
        var opt = {
            repository: repository,
            project: project,
            branch: branch,
            studio: studio,
            runtime: runtime
        };

        var runtimeUrl;
        var startUrl;
        var client;

        return forms.getRuntimeClient(opt)
            .then(function(runtimeClient){
                client = runtimeClient;
                return forms.getConfig(opt);
            })
            .then(function(config){
                var rt = url.parse(config.runtime);
                runtimeUrl = 'http://' + rt.hostname + ':' + rt.port + rt.pathname;
                startUrl = runtimeUrl + '/server/start';

                return client.get('/shortcuts');
            })
            .then(function(result){
                var path = temp.path({suffix: '.html'});
                var html = '<html><head><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous"><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css" integrity="sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r" crossorigin="anonymous"></head><body class="container">';

                html+='<h3>Shortcuts for: <small>'+runtimeUrl+'</small></h3>';


                html+='<table class="table table-hover table-bordered table-condensed">';
                html+='<thead><tr>';
                html+='<th>Name</th>';
                html+='<th>Project</th>';
                html+='<th>Version</th>';
                html+='<th>Flow</th>';
                html+='<th>Language Code</th>';
                html+='<th>UI</th>';
                html+='<th>Theme</th>';
                html+='<th></th>';
                html+='</tr></thead><tbody style="font-size: 14px;" >';


                _.each(result.items, function(shortcut){
                    html+='<tr>';
                    html+='<th>'+ shortcut.name +'</th>';
                    html+='<td>'+ shortcut.project +'</td>';
                    html+='<td>'+ shortcut.version +'</td>';
                    html+='<td>'+ shortcut.flow +'</td>';
                    html+='<td>'+ shortcut.languageCode +'</td>';
                    html+='<td>'+ shortcut.ui +'</td>';
                    html+='<td>'+ shortcut.theme +'</td>';
                    html+='<td><a class="btn btn-link btn-sm" href="'+ startUrl + '/' + shortcut.name +'">Start</a></td>';
                    html+='</tr>';
                });

                html +='</tbody></table></body></html>';

                return fs.writeFileAsync(path, html).then(function(){
                    opener(path);
                });

            });
    }
});
