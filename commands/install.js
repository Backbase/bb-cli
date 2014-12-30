var Command = require('ronin').Command;

var chalk = require('chalk');
var spawn = require('cross-spawn');
var bower = require('bower');
var path = require('path');
var _ = require('lodash');
var fs = require('node-fs-extra');
var buildConfig = require('bower-requirejs/lib/build-config');

var baseUrl = process.cwd();

var options = {
    requireConfPath: path.join(baseUrl, 'require-config.js'),
    bowerBuildConfig: {
        //exclude: ['underscore', 'jquery'],
        transitive: true
    }
};

var getComponentPaths = function(allDependencies, bowerComponents) {
    var output = {
        paths: {}
    };

    _.forOwn(allDependencies, function (value, key) {
        // Check if it's node client-side dep
        if (!bowerComponents.paths.hasOwnProperty(key)) {
            output.paths[key] = value;
        }
    });

    return output;
};

var writeRequireConf = function(preparedConf){
    var data = 'require.config(' + JSON.stringify(preparedConf, null, 4) + ');';

    console.log(chalk.green('Generated RequireJS conf:'), data);

    fs.writeFile(options.requireConfPath, data, function (err) {
      if (err) throw err;
      console.log(chalk.green('RequireJS conf saved to:'), options.requireConfPath);
    });
};

var generateRequireConf = function(){
    // Getting full dep graph
    bower.commands.list({})
        .on('end', function (dependencyGraph) {
            var endResult = {};

            // Generate cliend-side deps configuration for RequireJS
            var configElementsFromBower = buildConfig(dependencyGraph, options.bowerBuildConfig);

            // Getting only list of dep paths
            bower.commands.list({paths: true})
                .on('end', function (dependencyPaths) {
                    // Getting list of BB components without main file defined
                    var componentsPaths = getComponentPaths(dependencyPaths, configElementsFromBower);

                    endResult = _.merge(configElementsFromBower, componentsPaths);
                    writeRequireConf(endResult);
                });
        });
};

var install = function(){
    console.log(chalk.gray('Running Bower install...'));

    // First, we install all bower deps
    spawn('bower', ['install'], {stdio: 'inherit'}).on('close', function () {
        console.log(chalk.gray('Bower install done, proceed to RequireJS conf generation...'));

        // Then we generate RequireJS conf
        generateRequireConf()
    });
};

var Install = Command.extend({
    desc: 'Insert your description',

    run: install
});

module.exports = Install;