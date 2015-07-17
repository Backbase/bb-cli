'use strict';

var Command = require('ronin').Command;
var chalk = require('chalk');
var spawn = require('cross-spawn');
var path = require('path');
var util = require('../lib/util');
var GenerateRequireConf = require('../lib/generateRequireConf');
var restUtils = require('../lib/restUtils');
var depUtils = require('../lib/depUtils');
var configLib = require('../lib/config');
var Q = require('q');
var bower = require('bower');
var mvnCredentials = require('mvn-credentials');

var baseUrl = process.cwd();
var cliRoot = path.resolve(__dirname, '..');

var config = {
    customArgs: [
        '--catalog','-C',
        '--catalog-all','-A',
        '--base-url',
        '--require-confs',
        '--verbose', '-v',
        '--nested', '-n'
    ]
};

var fillConfWithArgs = function(bbRc, argOptions){
    if (argOptions['base-url']) bbRc.install.requirejsBaseUrl = argOptions['base-url'];
    if (argOptions['require-confs']) bbRc.install.requirejsConfigs = argOptions['require-confs'].split(',');

    return bbRc;
};

var install = function(componentEndpoint){
    var cmdArgs = process.argv;
    var that = this;

    Q.allSettled([
        configLib.getBower(),
        configLib.getBowerRc(),
        configLib.getBbRc(),
        mvnCredentials.fetch()
    ]).spread(function (bowerJSON, bowerConf, bbRc, credentials) {
        bowerJSON = bowerJSON.state === 'fulfilled' ? bowerJSON.value : {};
        bowerConf = bowerConf.state === 'fulfilled' ? bowerConf.value : {};
        bbRc = bbRc.state === 'fulfilled' ? bbRc.value : {};
        credentials = credentials.state === 'fulfilled' ? credentials.value : undefined;

        var deffered = Q.defer();
        var localBowerBin = path.join(cliRoot, 'node_modules/bower/bin/bower');
        var bowerCommand = [localBowerBin, 'install'];
        var argVerbose = cmdArgs.indexOf('--verbose') > -1 || cmdArgs.indexOf('-v') > -1;
        var argCatalogAll = cmdArgs.indexOf('--catalog-all') > -1 || cmdArgs.indexOf('-A') > -1;
        var msg = '\nBower install done, proceed to RequireJS conf generation...';
        var credentialsAvailable = credentials && credentials.username && credentials.password;

        if (credentialsAvailable) {
            bowerCommand.push('--config.auth.username=' + credentials.username);
            bowerCommand.push('--config.auth.password=' + credentials.password);
        }

        // Adding default directory field
        if (!bowerConf.directory) bowerConf.directory = 'bower_components';

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
        spawn('node', bowerCommand, {stdio: 'inherit'})
            .on('close', function () {
                var generateRJSConf = new GenerateRequireConf(baseUrl, bowerJSON, bowerConf, bbRc, argVerbose);

                console.log(chalk.gray(msg));

                // Then we generate RequireJS conf
                generateRJSConf.process().then(function(output){
                    var payload = {};

                    // Pass list with all bower components
                    if (argCatalogAll) {
                        payload.installAdditionalComponents = output.fsPaths;
                    }

                    if (!componentEndpoint) {
                        deffered.resolve(payload);
                        return;
                    }

                    // Check if we get plain component name or local path
                    if (componentEndpoint.split('/').length === 1) {
                        payload.componentPathAbsolute = path.join(baseUrl, output.fsPaths[componentEndpoint]);

                        deffered.resolve(payload);
                    } else {
                        var bowerInfoConfig = {};

                        if (credentialsAvailable) bowerInfoConfig.auth = credentials;

                        // Get latest installed components name
                        bower.commands.info(componentEndpoint, undefined, bowerInfoConfig)
                            .on('end', function (componentInfo) {
                                var componentName = componentInfo.latest && componentInfo.latest.name ? componentInfo.latest.name : componentInfo.name;
                                payload.componentPathAbsolute = path.join(baseUrl, output.fsPaths[componentName]);

                                deffered.resolve(payload);
                            })
                            .on('error', function (err) {
                                util.err(chalk.red('Error running Bower info.'));
                                deffered.reject(new Error(err));
                            });
                    }

                }).fail(function(err){
                    util.err(chalk.red('Something went wrong during requirejs configuration generation: '), err);
                    console.log(err.stack);
                });
            })
            .on('error', function(err) {
                util.err(chalk.red('Error running Bower command.'));
                deffered.reject(new Error(err));
            });

        return deffered.promise;

    }).then(function(payload){
        var deffered = Q.defer();
        var argCatalog = cmdArgs.indexOf('--catalog') > -1 || cmdArgs.indexOf('-C') > -1;
        var argCatalogAll = cmdArgs.indexOf('--catalog-all') > -1 || cmdArgs.indexOf('-A') > -1;

        if ((argCatalog || argCatalogAll) && (payload.installAdditionalComponents || payload.componentPathAbsolute)) {
            restUtils.submitToPortal(baseUrl, payload.installAdditionalComponents, false, payload.componentPathAbsolute).then(function(){
                deffered.resolve(payload);
            });
        } else {
            deffered.resolve(payload);
        }

        return deffered.promise;
    }).then(function(payload){
        var deffered = Q.defer();
        var argNested = cmdArgs.indexOf('--nested') > -1 || cmdArgs.indexOf('-n') > -1;

        if (argNested) {
            if (!payload.componentPathAbsolute) {
                util.warn('Can\'t get component path for nested install.');

                deffered.resolve(payload);

                return;
            }

            payload.nestedInstall = true;

            console.log(chalk.gray('\nRunning nested bb install...'));
            spawn('bb', ['install'], {
                    stdio: 'inherit',
                    cwd: payload.componentPathAbsolute
                })
                .on('close', function () {
                    deffered.resolve(payload);
                });
        } else {
            deffered.resolve(payload);
        }

        return deffered.promise;
    }).then(function(payload){
        if (!payload.nestedInstall) {
            util.ok('bb install finished successfully.');
        }
    }).fail(function(err){
        util.err(chalk.red('Something went wrong: '), err);
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
        r += '      -C,  --catalog <boolean>\t\t' + d('false') + '\t\t\tUpload single component to CXP via REST after install.\n';
        r += '      -A,  --catalog-all <boolean>\t' + d('false') + '\t\t\tUpload all installed components to CXP via REST after install.\n';
        r += '      -n,  --nested <boolean>\t\t' + d('false') + '\t\t\tRun secondary `bb install` in installed component.\n';
        r += '      -v,  --verbose <boolean>\t\t' + d('false') + '\t\t\tEnable verbose logging mode.\n';
        r += '           --base-url <string>\t\t' + d('path/to/bower_comp') + '\tWeb path to bower components directory (also configurable from .bbrc).\n';
        r += '           --require-confs <string>\t\t\t' + '\tComa seperated list of relative paths to existing require configuration (also configurable from .bbrc).\n';
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
