var inquirer = require("inquirer");
var chalk = require('chalk');
var importCXP = require('../lib/yapi/importCXP');
var path = require('path');
var Command = require('ronin').Command;

module.exports = Command.extend({
    desc: 'Imports portal model from xml files. YAPI CLI.',
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Imports to remote model from XML files. In default mode it takes first XML from the glob and imports it as full portal. In YAPI mode (experimental) merges all XML\'s same as in client side version.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description';
        r += '\n\n      -u,  --unattended <boolean>\t' + d('false') + '\t\tSkip all prompts and use options or defaults.';
        r += '\n      -s,  --search <string>\t\t' + d('*.xml') + '\t\tWild card glob to find Import files.';
        r += '\n      -v,  --verbose <boolean>\t\t' + d('false') + '\t\tPrints detailed output.';

        r += '\n      -p,  --portal <string> \t\t' + d('<prompt>') + ' \tPre-define portal name.\n';
        r += '\n      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.';
        r += '\n      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.';
        r += '\n      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.';
        r += '\n      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.';
        r += '\n      -w,  --password <string>\t\t' + d('admin') + '\t\tPassword.';

        r += '\n\n      -y,  --yapi <boolean>\t\t' + d('false') + '\t\tSwitch to CLI YAPI mode (experimental).';
        r += '\n      -c,  --cleanup <boolean>\t\t' + d('true') + '\t\tTo remove redundant remote properties if not matched locally (only in YAPI mode).';

        return r;
    },
    options: {
        cleanup: {
            type: 'boolean',
            alias: 'c',
            default: true
        },
        unattended: {//Get XML directly from this search or CWD without questions
            type: 'boolean',
            alias: 'u'
        },
        search: {//search using glob wild cards overriding search prompt
            type: 'string',
            alias: 's'
        },
        verbose: {//search using glob wild cards overriding search prompt
            type: 'boolean',
            alias: 'v'
        },
        yapi: {//search using glob wild cards overriding search prompt
            alias: 'y',
            type: 'boolean',
            default: false
        },
        host: {type: 'string', alias: 'H'},
        port: {type: 'string', alias: 'P'},
        context: {type: 'string', alias: 'c'},
        username: {type: 'string', alias: 'u'},
        password: {type: 'string', alias: 'w'},
        portal: {type: 'string', alias: 'p'}
    },
    run: function () {
        var cliOpts = this.options || {};

        if (!cliOpts.search || cliOpts.search.length === 0) {
            cliOpts.search = path.join(process.cwd(), '*.xml');
        } else {
            cliOpts.search = path.join(process.cwd(), cliOpts.search);
        }

        var startImport = (function(){
            if (cliOpts.yapi) {
                return importCXP.startImport;
            } else {
                return importCXP.startImportSimple;
            }
        })();

        if (cliOpts.unattended === true) {
            startImport(cliOpts);
        } else {

            var promptCleanup = {
                message: 'Do you want to remove redundant properties?',
                name: 'cleanup',
                type: 'confirm'
            };
            var prompts = [];

            if (!cliOpts.cleanup) {
                prompts.push(promptCleanup);
            }

            if (prompts.length > 0) {
                inquirer.prompt(prompts,
                    function (answers) {
                        cliOpts.cleanup = answers.cleanup || cliOpts.cleanup;

                        startImport(cliOpts);
                    }
                );
            } else {
                startImport(cliOpts);
            }
        }
    }
});
