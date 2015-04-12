var inquirer = require("inquirer");
var chalk = require('chalk');
var util = require('../lib/util');
var bbmodel = require('../lib/bbmodel');
var clui = require('clui');
var loading = new clui.Spinner('Please wait...');

var Command = require('ronin').Command;

var normalizeContextName = function(contextName){
    return contextName === '/' ? '' : contextName;
};

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Export portal model into xml files. This files can be then imported trough Yapi.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -p,  --portal <string> \t' + d('prompt') + ' \t\t Pre-define portal name.\n';
        r += '      -c,  --context <string> \t' + d('portalserver') + '\t Pre-define context name.\n';
        return r;
    },

    options: {
        portal: {
            type: 'string',
            alias: 'p'
        },
        context: {
            type: 'string',
            alias: 'c'
        }
    },

    run: function (portalName, contextName) {
        contextName = normalizeContextName(contextName);

        inquirer.prompt([{
            message: 'Server context name',
            name: 'contextName',
            type: 'input',
            default: 'portalserver',
            filter: function(answer){
                return normalizeContextName(answer);
            },
            when: function() {
                // Ask only of param was not provided
                return typeof contextName !== 'string';
            }
        }], function (answersLevelOne) {
            var context = typeof answersLevelOne.contextName === 'string' ? answersLevelOne.contextName : contextName;

            // Request portals list, if portal is not provided
            if (!portalName) {
                bbmodel.listPortals(context, function (portals) {
                    if (!portals) return util.err('Could not get portal list.');

                    inquirer.prompt([{
                        message: 'Choose the portal you want to export',
                        name: 'portalName',
                        type: 'list',
                        choices: portals
                    }], function (answersLevelTwo) {
                        exportPortal(answersLevelTwo.portalName, context);
                    });
                });
            } else {
                exportPortal(portalName, context);
            }
        });

        function exportPortal(portalName, contextName) {
            loading.start();
            bbmodel.getPortalModel(portalName, contextName, function (xml) {
                loading.stop();
                if (xml) {
                    areYouSure(function () {
                        bbmodel.exportPortal(xml, portalName, process.cwd(), function (file) {
                            util.ok(file);
                        });
                    });
                } else {
                    util.err("Portal doesn't exist or cannot be exported.");
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
