var path = require('path');
var fs = require('node-fs-extra');
var chalk = require('chalk');
var Q = require('q');
var __ = require('lodash-contrib');

module.exports.cleanLocalComponent = function(bowerPath, component){
    var componentName = component.split('/').pop();
    var componentPath = path.join(bowerPath, componentName);

    try {
        console.log(chalk.grey('Removing '+ component + '...'));
        fs.removeSync(componentPath);
    } catch(e) {
        console.log('Error removing component ' + component, e);
    }
};

module.exports.readBowerConfs = function(baseUrl){
    var deferred = Q.defer();

    fs.readJSON(path.join(baseUrl, 'bower.json'), function (err, bowerJSONdata) {
        if (err) {
            throw new Error(chalk.red('Could not find bower.json, please init your project first: '), err);
        }
        var bowerJSON = bowerJSONdata;

        fs.readJSON(path.join(baseUrl, '.bowerrc'), function (err, bowerOptsData) {
            var bowerOpts = bowerOptsData || {};

            deferred.resolve({
                bowerJSON: bowerJSON,
                bowerOpts: bowerOpts
            });
        });
    });

    return deferred.promise;
};

// TODO: set options from flags: requireConfPath, bowerBuildConfig, webURL, requirejsConfigs
module.exports.prepareOptions = function(baseUrl, bowerConfs){
    var options = {
        bowerJSON: bowerConfs.bowerJSON,
        bowerOpts: bowerConfs.bowerOpts,
        requireConfPath: path.join(baseUrl, 'bower_components', 'require-bower-config.js'),
        bowerBuildConfig: {
            //exclude: ['underscore', 'jquery'],
            transitive: true
        }
    };

    // If default directory is overrided, then update generated `require-bower-config.js` path
    if (__.hasPath(bowerConfs, 'bowerOpts.directory')) {
        options.requireConfPath = path.join(baseUrl, bowerConfs.bowerOpts.directory, 'require-bower-config.js');
    } else {
        // Declaring default path to bower
        options.bowerOpts.directory = path.join(baseUrl, 'bower_components');
    }

    return options;
};