var Command = require('ronin').Command;

var chalk = require('chalk');
var spawn = require('cross-spawn');
var bower = require('bower');
var path = require('path');
var __ = require('lodash-contrib');
var GenerateRequireConf = require('../lib/generateRequireConf');
var rest = require('../lib/rest');
var Q = require('q');
var fs = require('node-fs-extra');
var BBRest = require('mosaic-rest-js');
var inquirer = require("inquirer");

var baseUrl = process.cwd();
var options;

// TODO: set options from flags: requireConfPath, bowerBuildConfig, webURL, requirejsConfigs
var prepareOptions = function(confs){
    options = {
        bowerJSON: confs.bowerJSON,
        bowerOpts: confs.bowerOpts,
        requireConfPath: path.join(baseUrl, 'bower_components', 'require-bower-config.js'),
        bowerBuildConfig: {
            //exclude: ['underscore', 'jquery'],
            transitive: true
        }
    };

    // If default directory is overrided, then update generated `require-bower-config.js` path
    if (__.hasPath(confs, 'bowerOpts.directory')) {
        options.requireConfPath = path.join(baseUrl, confs.bowerOpts.directory, 'require-bower-config.js');
    } else {
        // Declaring default path to bower
        options.bowerOpts.directory = path.join(baseUrl, 'bower_components');
    }

    return options;
};

var readBowerConfs = function(){
    var deferred = Q.defer();

    fs.readJSON('./bower.json', function (err, bowerJSONdata) {
        if (err) {
            throw new Error(chalk.red('Could not find bower.json, please init your project first: '), err);
        }
        var bowerJSON = bowerJSONdata;

        fs.readJSON('./.bowerrc', function (err, bowerOptsData) {
            var bowerOpts = bowerOptsData || {};

            deferred.resolve({
                bowerJSON: bowerJSON,
                bowerOpts: bowerOpts
            });
        });
    });

    return deferred.promise;
};

// Submit all components or only selected one
var submitToPortal = function(componentsConfs, component){
    inquirer.prompt([
		{
			type: 'confirm',
            name: 'send',
            message: 'Install all components to your portal?',
            default: false
        },
		{
			type: 'input',
            name: 'portalName',
            message: 'Portal name:',
            default: 'dashboard',
            when: function(answers){
                return answers.send
            }
		}
	], function(answers){
        if (answers.send) {
            var bbrest = new BBRest();
            bbrest.config = {
                host: bbrest.config.host,
                port: bbrest.config.port,
                context: bbrest.config.context,
                username: bbrest.config.username,
                password: bbrest.config.password,
                portal: bbrest.config.portal || answers.portalName
            };

            var customComponents = componentsConfs.customComponents.paths;
            if (customComponents) {
                for (var module in customComponents) {
                    var modulePath = customComponents[module];

                    rest.submitDir(path.join(baseUrl, modulePath), bbrest, 'post');
                }
            }
        }
	});
};

var install = function(component){
    readBowerConfs().then(function(confs){
        prepareOptions(confs);

        var bowerCommand = ['install'];
        var msg = 'Bower install done, proceed to RequireJS conf generation...';

        if (component) {
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
            var generateRJSConf = new GenerateRequireConf(options);

            console.log(chalk.gray(msg));

            // Then we generate RequireJS conf
            generateRJSConf.process().then(function(confs){
                // And submit
                submitToPortal(confs);
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