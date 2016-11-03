
var chalk = require('chalk');
var Command = require('ronin').Command;
var bbGenerate = require('@bb-cli/bb-generate');
var ui = require('@bb-cli/base').ui;
var _ = require('lodash');
var partialRight = _.partialRight;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' <generator-name> [<template-name>]';
        r += '\n\t Scaffold widgets and containers.\n';
        r += '\n\t Generators must be installed first from separate packages.\n';
        r += '\t For a list of possible generators see https://www.npmjs.com/~bb-cli.\n';
        r += '\n  ' + title('Install a generator') + ':\n';
        r += '      npm install @bb-cli/generator-widget\n';
        r += '      npm install @bb-cli/generator-container\n';
        r += '\n  ' + title('List installed generators') + ':\n';
        r += '      bb generate\n';
        r += '\n  ' + title('Run a generator') + ':\n';
        r += '      bb generate widget\n';
        r += '      bb generate container';
        return r;
    },

    run: function(name, template){
        if (!name) {
            return list()
                .catch(handleError);
        } else {
            console.log(chalk.gray('Generating ' + name + ' on path: ' + process.cwd()));
            return generate(name, template)
                .catch(handleError);
        }
    }
});

function stdOut(out) {
    process.stdout.write(out + '\n');
}

function handleError(err) {
    console.log(err);
    if (err.stack) {
        console.log(err.stack);
    }
    process.exit(1);
}

function list(asJson) {
    /**
     * Formater
     * @private
     * @todo 1. move to formater.js
     */
    var formatOutput = function(res) {
        let output = '';
        var tableHeader = ['Name', 'Description', 'Version', 'Templates', 'Scope'];
        if (res.length) {
            output = '\nGenerate using ' + ui.colors.info('bb generate <name> [template]') + '\n';
        } else {
            output = '\nNo available generators found.\n';
            output += 'Try instaling ' + ui.colors.info('npm i -g <package-name>') + '\n';
        }
        var listTable = ui.table({
            head: tableHeader,
            colWidths: [20, 50, 15, 15, 20]
        });
        var tableRow = function(row) {
            var tpls = Object.keys(row.templates).join('\n');
            return [row.displayName, row.description, row.version, tpls, row.scope];
        };

        var rows = res.map(tableRow);
        listTable.push.apply(listTable, rows);

        output += listTable.toString();

        return output;
    };

    return bbGenerate.list()
        .then(formatOutput)
        .then(stdOut, handleError);
}

function generate(name, template) {
    var formatOutput = function(res) {
        return 'Item successfully generated in ' + ui.colors.info(res.path);
    };

    var options = {
        output: '.',
        scope: '',
        yes: false,
        exclude: ''
    };

    return bbGenerate.default(name, template, options)
        .then(formatOutput)
        .then(stdOut, handleError);
}
