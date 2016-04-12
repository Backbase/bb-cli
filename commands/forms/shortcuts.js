var url = require('url');
var _ = require('lodash');
var temp = require('temp');
var chalk = require('chalk');
var opener = require('opener');
var fs = require('fs-extra-promise');
var forms = require('../../lib/forms');
var Command = require('ronin').Command;

module.exports = Command.extend({
    desc: 'Show runtime shortcuts summary page',
    help: function(){
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS] [destination]';
        r += '\n\t Shows a generated summary page for currently defined shortcuts on the specified runtime server.';
        r += '\n\t If ' + d('destination') +' is not specified, a temporary path will be used and file will be opened automatically.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -rH,  --runtime <url>\t' + d('http://admin:admin@localhost:8086/forms-runtime') +'\t\Runtime host.\n';
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb forms shortcuts \tShows list of shortcuts and start links configured on the default runtime server.\n';
        return r;
    },
    options: forms.options,
    run: function (repository, project, branch, studio, runtime, destination) {
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
                var path = destination || temp.path({suffix: '.html'});

                try {
                    fs.accessSync(path, fs.F_OK);
                    if (fs.lstatSync(path).isDirectory())
                        path+='/shortcuts.html';
                } catch (e) {
                    // It isn't accessible
                }

                var html = '<html><head>' +
                    '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">' +
                    '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css" integrity="sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r" crossorigin="anonymous">' +
                    '<link rel="stylesheet" href="https://cdn.rawgit.com/HubSpot/sortable/master/css/sortable-theme-bootstrap.css">' +
                    '<script type="text/javascript" src="https://cdn.rawgit.com/HubSpot/sortable/master/js/sortable.min.js" ></script>' +
                    '</head><body class="container">';

                html+='<h3>Shortcuts for: <small>'+runtimeUrl+'</small></h3>';


                html+='<table class="table table-hover table-bordered table-condensed sortable-theme-bootstrap" data-sortable>';
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


                _.each(_.sortBy(result.items, 'name'), function(shortcut){
                    html+='<tr>';
                    html+='<td><strong>'+ shortcut.name +'</strong></td>';
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
                    if (!destination) opener(path);
                });
            });
    }
});
