var inquirer = require("inquirer");
var chalk = require('chalk');
var util = require('../lib/util');
var bbmodel = require('../lib/bbmodel');
var clui = require('clui');
var loading = new clui.Spinner('Please wait...');

var Command = require('ronin').Command;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Export portal model into xml files. This files can be then imported trough Yapi or `bb import`.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -s,  --structured <boolean> \t' + d('false') + ' \t\tBreak output xml to smaller files (beta).\n';
        r += '      -p,  --portal <string> \t\t' + d('<prompt>') + ' \tPre-define portal name.\n';
        r += '      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.\n';
        r += '      -w,  --password <string>\t\t' + d('admin') + '\t\tPassword.\n';
        return r;
    },

    options: {
        structured: {type: 'boolean', alias: 's'},
        host: {type: 'string', alias: 'H'},
        port: {type: 'string', alias: 'P'},
        context: {type: 'string', alias: 'c'},
        username: {type: 'string', alias: 'u'},
        password: {type: 'string', alias: 'w'},
        portal: {type: 'string', alias: 'p'}
    },

    run: function () {
        var cliOpts = this.options || {};

        // Request portals list, if portal is not provided
        if (!cliOpts.portal) {
            bbmodel.listPortals(cliOpts, function (portals) {
                if (!portals) return util.err('Could not get portal list.');

                inquirer.prompt([{
                    message: 'Choose the portal you want to export',
                    name: 'portalName',
                    type: 'list',
                    choices: portals
                }], function (answersLevelTwo) {
                    exportPortal(answersLevelTwo.portalName);
                });
            });
        } else {
            exportPortal(cliOpts.portal);
        }

        function exportPortal(portalName) {
            cliOpts.portal = portalName;

            loading.start();
            bbmodel.getPortalModel(cliOpts, function (xmlAst, rawXml) {
                loading.stop();
                if (xmlAst && rawXml) {
                    areYouSure(function () {
                        if (cliOpts.structured) {
                            bbmodel.exportPortalStructured(xmlAst, portalName, process.cwd(), function (file) {
                                util.ok(file);
                            });
                        } else {
                            bbmodel.exportPortal(rawXml, portalName, process.cwd(), function (file) {
                                util.ok(file);
                            });
                        }
                    });
                } else {
                    util.err('Portal doesn\'t exist or cannot be exported.');
                }
            });
        }

        function areYouSure(cb) {
            inquirer.prompt([{
                message: 'You are about to export your portal model into ' + chalk.green(process.cwd()) + '. ' + chalk.red('\n  This may override your files. Are you sure?'),
                name: 'confirm',
                type: 'confirm'
            }], function (answers) {
                if (answers.confirm) cb();
            });
        }
    }
});
