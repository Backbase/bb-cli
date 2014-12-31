var Command = require('ronin').Command;

var chalk = require('chalk');
var spawn = require('cross-spawn');
var bower = require('bower');
var path = require('path');
var _ = require('lodash');
var Q = require('q');
var fs = require('node-fs-extra');
var buildConfig = require('bower-requirejs/lib/build-config');
var JSZip = require("jszip");
var acorn = require('acorn');
var escodegen = require('escodegen');

var baseUrl = process.cwd();

// TODO: add flag options
var options = {
    requireConfPath: path.join(baseUrl, 'portalserver/src/main/webapp/static/launchpad/conf', 'require-bower-config.js'),
    bowerBuildConfig: {
        //exclude: ['underscore', 'jquery'],
        transitive: true
    }
};

var mergeRequireConf = function(input, pathsConfObj) {
    var mergedOutput = _.clone(input);

    for (var key in mergedOutput.paths) {
        if (pathsConfObj[key]) {
            // TODO: Ask user what how to resolve conflict
            // Delete conflicting dep
            delete mergedOutput.paths[key];
        }
    }

    return mergedOutput;
};

var getPathKeyFromRequireConf = function(astProperties){
    var output = {};

    astProperties.forEach(function(item){
        if (item.key.name === 'paths') {
            output = item.value;
        }
    });

    return output;
};

var parseRequireConf = function(raw){
    try {
        var ast = acorn.parse(raw);
        var output = escodegen.generate(getPathKeyFromRequireConf(ast.body[0].expression.arguments[0].properties), {
            format: {
                json: true
            }
        });
        return eval('('+output+')');
    } catch(e) {
        console.log('Failed to parse existing Require conf', e);
        return {};
    }
};

var readRequireConf = function(dir){
    var deferred = Q.defer();
    var warReg = /.war/g;
    var haveWar = warReg.test(dir);

    if (haveWar) {
        var splitDir = dir.split('.war');
        var pathToWar = splitDir[0] + '.war';
        var pathToInWar = splitDir[1].substring(1);

        fs.readFile(path.join(baseUrl, pathToWar), function (err, data) {
            if (err) throw err;
            var zip = new JSZip(data);

            deferred.resolve(parseRequireConf(zip.file(pathToInWar).asText()));
        });
    } else {
        fs.readFile(dir, 'utf-8', function (err, data) {
            if (err) throw err;

            deferred.resolve(parseRequireConf(data));
        });
    }

    return deferred.promise;
};

var compareRequireConf = function(inputConf, dependencyGraph) {
    var deferred = Q.defer();
    var bowerOptions = dependencyGraph.pkgMeta;
    var output = _.clone(inputConf);
    var order = 0;
    var requireConfList = bowerOptions.requirejsConfigs;

    if (requireConfList) {
        var read = function(pathToConf){
            readRequireConf(pathToConf).then(function(pathsConfObj){
                output = mergeRequireConf(output, pathsConfObj);

                order++;

                if (order < requireConfList.length) {
                    read(requireConfList[order]);
                } else {
                    deferred.resolve(output);
                }
            });
        };

        // Read first file
        read(requireConfList[order]);
    } else {
        deferred.resolve(output);
    }

    return deferred.promise;
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
            var bowerPaths = {};

            // Generate cliend-side deps configuration for RequireJS
            var libsPaths = buildConfig(dependencyGraph, options.bowerBuildConfig);

            // Getting only list of dep paths
            bower.commands.list({paths: true})
                .on('end', function (dependencyPaths) {
                    // Getting list of BB components without main file defined
                    var componentsPaths = getComponentPaths(dependencyPaths, libsPaths);

                    bowerPaths = _.merge(libsPaths, componentsPaths);

                    // Compare bower paths with existing libs outside bower
                    compareRequireConf(bowerPaths, dependencyGraph).then(function(mergedConf){
                        // Proceed to write
                        writeRequireConf(mergedConf);
                    });
                });
        });
};

var install = function(){
    console.log(chalk.gray('Running Bower install...'));

    // First, we install all bower deps
    //spawn('bower', ['install'], {stdio: 'inherit'}).on('close', function () {
        console.log(chalk.gray('Bower install done, proceed to RequireJS conf generation...'));

        // Then we generate RequireJS conf
        generateRequireConf();
    //});
};

var Install = Command.extend({
    desc: 'Insert your description',

    run: install
});

module.exports = Install;