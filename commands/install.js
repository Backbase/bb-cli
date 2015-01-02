var Command = require('ronin').Command;

var chalk = require('chalk');
var spawn = require('cross-spawn');
var bower = require('bower');
var path = require('path');
var __ = require('lodash-contrib');
var GenerateRequireConf = require('../lib/generateRequireConf');
var Q = require('q');
var fs = require('node-fs-extra');

var baseUrl = process.cwd();

// TODO: override options from flags: requireConfPath, bowerBuildConfig
// TODO: set options from flags - webURL, requirejsConfigs
var prepareOptions = function(confs){
    var options = {
        bowerJSON: confs.bowerJSON,
        bowerOpts: confs.bowerOpts,
        requireConfPath: path.join(baseUrl, 'bower_components', 'require-bower-config.js'),
        bowerBuildConfig: {
            //exclude: ['underscore', 'jquery'],
            transitive: true
        }
    };

    if (__.hasPath(confs, 'bowerOpts.directory')) {
        options.requireConfPath = path.join(baseUrl, confs.bowerOpts.directory, 'require-bower-config.js');
    }

    return options;
};

var readBowerConfs = function(){
    var deferred = Q.defer();

    fs.readJSON('./bower.json', function (err, bowerJSONdata) {
        if (err) {
            throw new Error('Could not find bower.json, please init your project first: ', err);
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

var install = function(){
    readBowerConfs().then(function(confs){
        var options = prepareOptions(confs);

        console.log(chalk.gray('Running Bower install...'));

        // First, we install all bower deps
        spawn('bower', ['install'], {stdio: 'inherit'}).on('close', function () {
            console.log(chalk.gray('Bower install done, proceed to RequireJS conf generation...'));

            var generate = new GenerateRequireConf(options);

            // Then we generate RequireJS conf
            generate.getAndWrite();
        });
    }).fail(function(err){
        console.log('Something went wrong, during Bower configuration read: ', err);
    });
};

var Install = Command.extend({
    desc: 'Insert your description',

    run: install
});

module.exports = Install;