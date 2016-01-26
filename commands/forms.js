var chalk = require('chalk');
var Command = require('ronin').Command;

var help = function(){
    var title = chalk.bold;
    var d = chalk.gray;
    var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' command [OPTIONS]';
    r += '\n\t Backbase forms tools.';
    r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
    r += '      -r,  --repository <string>\t' + d('')+ '\t\t Forms repository name.\n';
    r += '      -b,  --branch <boolean>\t\t' + d('')+  '\t\t Forms branch.\n';
    r += '      -p,  --project <boolean>\t\t' +d('')+  '\t\t Forms project name.\n';

    r += '      -H,  --host <string>\t\t' + d('localhost') + '\t The host name of the server running studio.\n';
    r += '      -P,  --port <number>\t\t' + d('7777') + '\t\t The port of the server running studio.\n';
    r += '      -c,  --context <string>\t\t' + d('portalserver') + '\t The application context of studio.\n';
    r += '      -u,  --username <string>\t\t' + d('admin') + '\t\t Username.\n';
    r += '      -x,  --password <string>\t\t' + d('welcome') + '\t\t Password.\n';
    r += '\n'+ title('Commands');
    r += '\n export, list';
    return r;
};

module.exports = Command.extend({
    help: help,
    run: function () {
        console.log(help());
    }
});
