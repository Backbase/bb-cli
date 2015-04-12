var inquirer = require("inquirer");
var chalk = require('chalk');
var _ = require('lodash');
var util = require('../lib/util');
var bbmodel = require('../lib/bbmodel');
var importCXP = require('../lib/yapi/importCXP');

var clui = require('clui');
var loading = new clui.Spinner('Please wait...');
var Command = require('ronin').Command;

module.exports = Command.extend({
    desc: 'Imports portal model from xml files. Yapi CLI.',

    run: function () {
        inquirer.prompt([{
                message: 'This import will compare remote items and remove redundant preoperties, do you want to continue?',
                name: 'confirm',
                type: 'confirm'
            }],
            function (answers) {
                if (answers.confirm) {
                    inquirer.prompt([{
                            message: 'To search for your imports, you can add your glob here:',
                            default: '/test/import/**/*.xml',
                            name: 'fileGlob',
                            type: 'input'
                        }],
                        function (answers) {
                            importCXP.startImport(process.cwd() + answers.fileGlob);
                        }
                    );
                } else {
                    util.err("OK, good bye.");
                }
            }
        );
    }
});
