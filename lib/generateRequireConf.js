var chalk = require('chalk');
var __ = require('lodash-contrib');
var _ = require('lodash');
var Q = require('q');
var fs = require('node-fs-extra');
var buildConfig = require('bower-requirejs/lib/build-config');
var JSZip = require("jszip");
var acorn = require('acorn');
var escodegen = require('escodegen');
var bower = require('bower');

var baseUrl = process.cwd();

function GenerateRequireConf(options) {
    this.options = options;
}

GenerateRequireConf.prototype.getAndWrite = function(){
    var _this = this;

    // Getting full dep graph
    bower.commands.list({})
        .on('end', function (dependencyGraph) {
            var bowerPaths = {};

            // Generate cliend-side deps configuration for RequireJS
            var libsPaths = buildConfig(dependencyGraph, _this.options.bowerBuildConfig);

            // Getting only list of dep paths
            bower.commands.list({paths: true})
                .on('end', function (dependencyPaths) {
                    // Getting list of BB components without main file defined
                    var componentsPaths = _this.getComponentPaths(dependencyPaths, libsPaths);

                    bowerPaths = _.merge(libsPaths, componentsPaths);

                    // Compare bower paths with existing libs outside bower
                    _this.compareRequireConf(bowerPaths)
                        .then(function(mergedConf){
                            return _this.applyWebUrl.apply(_this, [mergedConf]);
                        })
                        .then(function(finalOptions){
                            _this.writeRequireConf.apply(_this, [finalOptions]);
                        }).fail(function(err){
                            console.log(chalk.red('Something went wrong, during RequireJS options generation: '), err);
                        });
                });
        });
};

GenerateRequireConf.prototype.mergeRequireConf = function(input, pathsConfObj) {
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

GenerateRequireConf.prototype.getPathKeyFromRequireConf = function(astProperties){
    var output = {};

    astProperties.forEach(function(item){
        if (item.key.name === 'paths') {
            output = item.value;
        }
    });

    return output;
};

GenerateRequireConf.prototype.parseRequireConf = function(raw){
    try {
        var ast = acorn.parse(raw);
        var output = escodegen.generate(this.getPathKeyFromRequireConf(ast.body[0].expression.arguments[0].properties), {
            format: {
                json: true
            }
        });
        return eval('('+output+')');
    } catch(e) {
        console.log(chalk.red('Failed to parse existing Require conf'), e);
        return {};
    }
};

GenerateRequireConf.prototype.readRequireConf = function(dir){
    var deferred = Q.defer();
    var warReg = /.war/g;
    var haveWar = warReg.test(dir);
    var _this = this;

    if (haveWar) {
        var splitDir = dir.split('.war');
        var pathToWar = splitDir[0] + '.war';
        var pathToInWar = splitDir[1].substring(1);

        fs.readFile(path.join(baseUrl, pathToWar), function (err, data) {
            if (err) throw err;
            var zip = new JSZip(data);

            deferred.resolve(_this.parseRequireConf(zip.file(pathToInWar).asText()));
        });
    } else {
        fs.readFile(dir, 'utf-8', function (err, data) {
            if (err) throw err;

            deferred.resolve(_this.parseRequireConf(data));
        });
    }

    return deferred.promise;
};

GenerateRequireConf.prototype.compareRequireConf = function(inputConf) {
    var _this = this;
    var deferred = Q.defer();
    var output = _.clone(inputConf);
    var order = 0;
    var requireConfList = __.hasPath(this.options, 'bowerOpts.custom.requirejsConfigs') ? this.options.bowerOpts.custom.requirejsConfigs : undefined;

    if (requireConfList) {
        var goForNext = function (){
            if (order < requireConfList.length) {
                read(requireConfList[order]);
            } else {
                deferred.resolve(output);
            }
        };

        var read = function(pathToConf){
            _this.readRequireConf(pathToConf).then(function(pathsConfObj){
                output = _this.mergeRequireConf(output, pathsConfObj);

                order++;

                goForNext();
            }).fail(function(err){
                console.log(chalk.yellow('Error reading RequireJS conf "' + pathToConf + '", skipping. Log: '), err);

                goForNext();
            });
        };

        // Read first file
        read(requireConfList[order]);
    } else {
        deferred.resolve(output);
    }

    return deferred.promise;
};

GenerateRequireConf.prototype.getComponentPaths = function(allDependencies, bowerComponents) {
    var output = {
        paths: {}
    };

    _.forOwn(allDependencies, function (value, key) {
        // Check if it's node client-side dep
        if (!bowerComponents.paths.hasOwnProperty(key)) {
            output.paths[key] = value;
        }
    });

    if (__.hasPath(this.options, 'bowerOpts.directory')) {
        output.paths['bower_components'] = this.options.bowerOpts.directory;
    }

    return output;
};

GenerateRequireConf.prototype.applyWebUrl = function(mergedConf){
    var output = mergedConf;
    var deferred = Q.defer();
    var _this = this;

    if (__.hasPath(_this.options, 'bowerOpts.custom.webUrl')) {
        var basePath = __.hasPath(_this.options, 'bowerOpts.directory') ? _this.options.bowerOpts.directory : 'bower_components';

        _.forOwn(output.paths, function (value, key) {
            output.paths[key] = value.replace(basePath, _this.options.bowerOpts.custom.webUrl);
        });
    }

    deferred.resolve(output);

    return deferred.promise;
};

GenerateRequireConf.prototype.writeRequireConf = function(preparedConf){
    var data = 'require.config(' + JSON.stringify(preparedConf, null, 4) + ');';
    var _this = this;

    console.log(chalk.green('Generated RequireJS conf:'), data);

    fs.outputFile(this.options.requireConfPath, data, function (err) {
      if (err) throw err;
      console.log(chalk.green('RequireJS conf saved to:'), _this.options.requireConfPath);
    });
};

module.exports = GenerateRequireConf;