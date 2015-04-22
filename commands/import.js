var inquirer = require("inquirer");
var chalk = require('chalk');
var _ = require('lodash');
var bbmodel = require('../lib/bbmodel');
var importCXP = require('../lib/yapi/importCXP');
var path = require('path');
var Command = require('ronin').Command;

module.exports = Command.extend({
    desc: 'Imports portal model from xml files. Yapi CLI.',
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
        }
    },
    help: function () {
        var title = chalk.bold,
            d = chalk.gray,
            r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]'
                + '\n\t Imports to remote model from XML files.'
                + '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description'
                + '\n\n      -c,  --cleanup <boolean>\t\t' + d('true') + '\t\t To remove redundant remote properties if not matched locally.'
                + '\n      -u,  --unattended <boolean>\t' + d('false') + '\t\t Skip all prompts and use options or defaults.'
                + '\n      -s,  --search <string>\t\t' + d('*.xml') + '\t\t Wild card glob to find Import files.'
                + '\n      -v,  --verbose <boolean>\t\t' + d('false') + '\t\t Prints detailed output.';
        return r;
    },
    run: function () {
        var Options = this.options;

        if (Options.unattended === true) {
            if (Options.search.length === 0) {
                Options.search = path.join(process.cwd(), '/*.xml');
            } else {
                Options.search = path.join(process.cwd(), Options.search);
            }

            importCXP.startImport(Options);
        } else {

            var promptCleanup = {
                    message: 'Do you want to remove redundant properties?',
                    name: 'cleanup',
                    type: 'confirm'
                },
                promptSearch = {
                    message: 'Search for imports:',
                    default: '/*.xml', //'/test/import/5.5/**/*.xml',
                    name: 'fileGlob',
                    type: 'input'
                },
                prompts = [];


            if (!Options.cleanup) {
                prompts.push(promptCleanup);
            }

            if (!Options.search || Options.search.length === 0) {
                prompts.push(promptSearch);
            } else {
                Options.search = path.join(process.cwd(), Options.search);
            }

            if (prompts.length > 0) {
                inquirer.prompt(prompts,
                    function (answers) {
                        Options.cleanup = answers.cleanup || Options.cleanup;
                        Options.search = answers.fileGlob ? path.join(process.cwd() + answers.fileGlob) : Options.search;

                        importCXP.startImport(Options);
                    }
                );
            } else {
                importCXP.startImport(Options);
            }

        }
    }
});
