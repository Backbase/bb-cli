var Command = require('ronin').Command;

var chalk = require('chalk');
var spawn = require('cross-spawn');
var bower = require('bower');
var path = require('path');
var GenerateRequireConf = require('../lib/generateRequireConf');
var restUtils = require('../lib/restUtils');
var depUtils = require('../lib/depUtils');
var Q = require('q');
var fs = require('node-fs-extra');

var baseUrl = process.cwd();
var options;

var install = function(component){
    depUtils.readBowerConfs(baseUrl).then(function(bowerConfs){
        options = depUtils.prepareOptions(baseUrl, bowerConfs);

        var bowerCommand = ['install'];
        var msg = 'Bower install done, proceed to RequireJS conf generation...';

        if (component) {
            if (component.substring(0,2) === './' || component[0] === '/') {
                depUtils.cleanLocalComponent(path.join(baseUrl, options.bowerOpts.directory), component);
            }

            msg = 'Component "'+ component +'" install done, proceed to RequireJS conf generation...';
        }

        if (process.argv) {
            process.argv.forEach(function(arg){
                bowerCommand.push(arg);
            })
        }

        console.log(chalk.gray('Running Bower install...'));

        // First, we install all bower deps
        spawn('bower', bowerCommand, {stdio: 'inherit'}).on('close', function () {
            var generateRJSConf = new GenerateRequireConf(options, baseUrl);

            console.log(chalk.gray(msg));

            // Then we generate RequireJS conf
            generateRJSConf.process().then(function(confs){
                // And submit
                restUtils.submitToPortal(baseUrl, confs);
            });
        })
    }).fail(function(err){
        console.log(chalk.red('Something went wrong, during Bower configuration read: '), err);
    });
};

var Install = Command.extend({
    desc: 'Installs all or specified bower dependency, generates RequireJS configuration and uploads component model to portal',

    run: install
});

module.exports = Install;