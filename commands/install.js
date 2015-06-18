'use strict';

var Command = require('ronin').Command;
var chalk = require('chalk');
var spawn = require('cross-spawn');
var path = require('path');
var GenerateRequireConf = require('../lib/generateRequireConf');
var restUtils = require('../lib/restUtils');
var depUtils = require('../lib/depUtils');
var configLib = require('../lib/config');
var q = require('q');
var bower = require('bower');

var baseUrl = process.cwd();

var config = {
    customArgs: [
        '--catalog','-C',
        '--base-url',
        '--require-confs'
    ]
};

var fillConfWithArgs = function(bbRc, argOptions){
    if (argOptions['base-url']) bbRc.requirejsBaseUrl = argOptions['base-url'];
    if (argOptions['require-confs']) bbRc.requirejsConfigs = argOptions['require-confs'].split(',');

    return bbRc;
};

var install = function(componentEndpoint){
    var that = this;

    // Get bower.json and .bowerrc
    q.all([
        configLib.getBower(),
        configLib.getBowerRc(),
        configLib.getBbRc()
    ]).spread(function (bowerJSON, bowerConf, bbRc) {
        var bowerCommand = ['install'];
        var cmdArgs = process.argv;
        var argCatalog = cmdArgs.indexOf('--catalog') > -1 || cmdArgs.indexOf('-C') > -1;
        var msg = 'Bower install done, proceed to RequireJS conf generation...';

        // Adding default directory field
        if (!bowerConf.directory) bowerConf.directory = path.join(baseUrl, 'bower_components');

        // Applying arguments overrides
        bbRc = fillConfWithArgs(bbRc, that.options);

        // If installing component by name
        if (componentEndpoint){

            // If we install local component, we need to first delete previous one
            if (componentEndpoint.substring(0, 2) === './' || componentEndpoint[0] === '/') {
                depUtils.cleanLocalComponent(path.join(baseUrl, bowerConf.directory), componentEndpoint);
            }

            msg = 'Component "'+ componentEndpoint +'" install done, proceed to RequireJS conf generation...';
        }

        // Pass all arguments to bower
        if (cmdArgs){
            cmdArgs.forEach(function(arg){
                // Except internal ones
                if (config.customArgs.indexOf(arg) === -1) bowerCommand.push(arg);
            });
        }

        console.log(chalk.gray('Running Bower install...'));

        // First, we install all bower deps
        spawn('bower', bowerCommand, {stdio: 'inherit'})
            .on('close', function () {
                var generateRJSConf = new GenerateRequireConf(baseUrl, bowerJSON, bowerConf, bbRc);

                console.log(chalk.gray(msg));

                // Then we generate RequireJS conf
                generateRJSConf.process().then(function(output){
                    var componentPathAbsolute;
                    var noName;

                    if (componentEndpoint) {
                        if (componentEndpoint.split('/').length === 1) {
                            componentPathAbsolute = path.join(baseUrl, output.fsPaths[componentEndpoint]);

                            console.log('componentPathAbsolute', componentPathAbsolute);

                        } else {
                            // If we're asked to install relative component, we can't get it's name and path
                            noName = true;
                        }
                    }

                    if (argCatalog) {
                        if (!noName) {
                            restUtils.submitToPortal(baseUrl, output.fsPaths, false, componentPathAbsolute);
                        } else {
                            // Get component name by endpoint
                            bower.commands.info(componentEndpoint)
                                .on('end', function (componentInfo) {
                                    var componentName = componentInfo.latest.name;
                                    var componentPath = path.join(baseUrl, output.fsPaths[componentName]);

                                    restUtils.submitToPortal(baseUrl, {}, false, componentPath);
                                });
                        }
                    }
                }).fail(function(err){
                    console.log(chalk.red('Something went wrong during requirejs configuration generation: '), err);
                    console.log(err.stack);
                });
            });

    }).fail(function(err){
        console.log(chalk.red('Something went wrong, during Bower configuration read: '), err);
        console.log(err.stack);
    });
};

var Install = Command.extend({
    desc: 'Bower wrapper with post generation of requirejs',
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t bb ' + this.name + ' <bower-endpoint> [<bower-endpoint> ..] [OPTIONS]';
        r += '\n\n\t Installs all or specified Bower dependencies, generates RequireJS configuration and uploads component model to portal on request.';
        r += '\n\t Also accepts `bower install` arguments like --save, -save-dev, --production, check `bower install -h`.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -C,  --catalog <boolean>\t\t' + d('false') + '\t\t\tUpload components to CXP via REST after install.\n';
        r += '           --base-url <string>\t\t' + d('bower_components/path') + '\tWeb path to bower components directory.\n';
        //r += '           --require-confs <string>\t\t\t' + '\t\tComa seperated list of relative paths to existing require configuration.\n';
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb install\t\t\tInstalls all Bower dependencies and runs requirejs conf generation.\n';
        r += '      bb install jquery\t\t\tInstalls jquery component and runs rjs-conf generation.\n';
        r += '      bb install widget-feed -C\t\tInstalls widget, generates rjs-conf and uploads it to CXP via REST.\n';
        r += '\n';
        return r;
    },

    run: install
});

module.exports = Install;
