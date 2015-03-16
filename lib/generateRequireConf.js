/* jshint -W061 */

'use strict';

var chalk = require('chalk');
var __ = require('lodash-contrib');
var _ = require('lodash');
var Q = require('q');
var fs = require('node-fs-extra');
var buildConfig = require('bower-requirejs/lib/build-config');
var JSZip = require('jszip');
var acorn = require('acorn');
var escodegen = require('escodegen');
var bower = require('bower');
var path = require('path');
var depUtils = require('./depUtils');

/**
 * Require configuration generator Class
 *
 * @param {String} baseUrl - path to destination directory
 * @param {Object} bowerJSON - bower.json conf
 * @param {Object} bowerRc - .bowerrc conf
 */
function GenerateRequireConf(baseUrl, bowerJSON, bowerRc, bbJSON) {
    this.options = {
        bowerJSON: bowerJSON,
        bowerOpts: bowerRc,
        bbJSON: bbJSON,
        requireConfPath: depUtils.getRequireConfPath(baseUrl, bowerRc)
    };
    this.baseUrl = baseUrl;
}

/**
 * Generate requirejs conf
 *
 * @promise {Object} returns combined object with requirejs options, bower pkgMeta and custom components list
 */
GenerateRequireConf.prototype.process = function(){
    var deferred = Q.defer();
    var that = this;

    // Getting full dep graph for bower-requirejs
    bower.commands.list({}, {cwd: that.baseUrl})
        .on('end', function (dependencyGraph) {
            var bowerPaths = {};

            // Generate client-side deps configuration for RequireJS
            var libsPaths = buildConfig(dependencyGraph, {
                transitive: true
            });

            // Getting only list of dep paths
            bower.commands.list({paths: true}, {cwd: that.baseUrl})
                .on('end', function (dependencyPaths) {

                    // Getting list of BB components without main file defined
                    var componentsPaths = that.getComponentPaths(dependencyPaths, libsPaths);

                    // Merging common
                    bowerPaths = _.merge(libsPaths, {
                        paths: componentsPaths
                    });

                    // Compare bower paths with existing libs outside bower
                    that.compareRequireConf(bowerPaths, that.options.bbJSON.requirejsConfigs)
                        .then(function(mergedConf){
                            return that.applyWebUrl.apply(that, [mergedConf, that.options.bbJSON.dependenciesWebUrl]);
                        })
                        .then(function(finalOptions){
                            that.writeRequireConf.apply(that, [finalOptions]).then(function(){
                                deferred.resolve({
                                    generatedConf: finalOptions,
                                    customComponents: componentsPaths,
                                    pkgMeta: dependencyGraph.pkgMeta
                                });
                            });
                        }).fail(function(err){
                            console.log(chalk.red('Something went wrong, during RequireJS options generation: '), err);
                            deferred.reject(err);
                        });
                });
        });

    return deferred.promise;
};

/**
 * Merge generated requirejs config with existing one
 *
 * @param {Object} input - generated require js conf
 * @param {Object} pathsToCompare - existing require js conf
 *
 * @returns {Object} returns trimmed generated object, without those keys that were already defined
 */
GenerateRequireConf.prototype.mergeRequireConf = function(input, pathsToCompare) {
    var mergedOutput = _.clone(input);

    for(var key in mergedOutput.paths) {
        if (pathsToCompare[key]) {
            // TODO: Ask user what how to resolve conflict
            // Delete conflicting dep
            delete mergedOutput.paths[key];
        }
    }

    return mergedOutput;
};

/**
 * Read AST and return paths object
 *
 * @param {Object} astProperties - AST tree of requirejs config
 *
 * @returns {Object} returns path object contents
 */
GenerateRequireConf.prototype.getPathKeyFromRequireConf = function(astProperties){
    var output = {};

    astProperties.forEach(function(item){
        if (item.key.name === 'paths') {
            output = item.value;
        }
    });

    return output;
};

/**
 * Read require configuration and return path object
 *
 * @param {String} raw - raw file contents
 *
 * @returns {Object} returns path object of require conf
 */
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

/**
 * Read defined requirejs conf, works with .war paths
 *
 * @param {String} filePath - generated require js conf
 *
 * @promise {Object} returns parsed contents of require conf
 */
GenerateRequireConf.prototype.readRequireConf = function(filePath){
    var deferred = Q.defer();
    var warReg = /.war/g;
    var haveWar = warReg.test(filePath);
    var that = this;

    if (haveWar) {
        var splitDir = filePath.split('.war');
        var pathToWar = splitDir[0] + '.war';
        var pathToInWar = splitDir[1].substring(1);

        fs.readFile(path.join(this.baseUrl, pathToWar), function (err, data) {
            if (err) throw err;
            var zip = new JSZip(data);

            deferred.resolve(that.parseRequireConf(zip.file(pathToInWar).asText()));
        });
    } else {
        fs.readFile(filePath, 'utf-8', function (err, data) {
            if (err) throw err;

            deferred.resolve(that.parseRequireConf(data));
        });
    }

    return deferred.promise;
};

/**
 * Compare existing require js configurations with generated one
 *
 * @param {Object} inputConf - generated require js conf
 * @param {Array} existingConfsArr - array with list of existing requirejs configurations
 *
 * @promise {Object} returns trimmed generated object, without those keys that were already defined
 */
GenerateRequireConf.prototype.compareRequireConf = function(inputConf, existingConfsArr) {
    var that = this;
    var deferred = Q.defer();
    var output = _.clone(inputConf);
    var order = 0;

    if (existingConfsArr) {
        var goForNext = function (){
            if (order < existingConfsArr.length) {
                read(existingConfsArr[order]);
            } else {
                deferred.resolve(output);
            }
        };

        var read = function(pathToConf){
            that.readRequireConf(pathToConf).then(function(pathsConfObj){
                output = that.mergeRequireConf(output, pathsConfObj);

                order++;

                goForNext();
            }).fail(function(err){
                console.log(chalk.yellow('Error reading RequireJS conf "' + pathToConf + '", skipping. Log: '), err);

                goForNext();
            });
        };

        // Read first file
        read(existingConfsArr[order]);
    } else {
        deferred.resolve(output);
    }

    return deferred.promise;
};

/**
 * Get list of component paths
 *
 * @param {Object} allDependencies - paths to all bower components (mix of lib paths and component paths)
 * @param {Object} bowerComponents - pre-configured list of bower lib components for requirejs conf
 *
 * @returns {Object} Returns paths object with all custom components paths
 */
GenerateRequireConf.prototype.getComponentPaths = function(allDependencies, bowerComponents) {
    var paths = {};

    _.forOwn(allDependencies, function (value, key) {
        // Check if it's not client-side dep
        if (!bowerComponents.paths.hasOwnProperty(key)) {
            paths[key] = value;
        }
    });

    if (__.hasPath(this.options, 'bowerOpts.directory')) {
        paths.bower_components = this.options.bowerOpts.directory;
    }

    return paths;
};

/**
 * Replaces file system paths to web urls
 *
 * @param {Object} requireConf - generated require conf object
 * @param {String} webUrl - web url configuration
 *
 * @promise {Object} returns updated require conf object with web urls
 */
GenerateRequireConf.prototype.applyWebUrl = function(requireConf, webUrl){
    var output = requireConf;
    var deferred = Q.defer();
    var that = this;

    // Check if we have webUrl specified
    if (webUrl) {
        var basePath = __.hasPath(that.options, 'bowerOpts.directory') ? that.options.bowerOpts.directory : 'bower_components';

        // Prepare web paths
        _.forOwn(output.paths, function (value, key) {
            output.paths[key] = value.replace(basePath, webUrl);
        });
    }

    // If no custom webUrl specified, take default from bower
    deferred.resolve(output);

    return deferred.promise;
};

/**
 * Write requirejs conf to fs
 *
 * @param {Object} preparedConf - conf to write
 *
 * @promise {Object} returns contents of the file
 */
GenerateRequireConf.prototype.writeRequireConf = function(preparedConf){
    var deferred = Q.defer();
    var data = 'require.config(' + JSON.stringify(preparedConf, null, 4) + ');';
    var that = this;

    //console.log(chalk.green('Generated RequireJS conf:'), data);

    fs.outputFile(this.options.requireConfPath, data, function (err) {
        if (err) throw err;
        console.log(chalk.green('RequireJS conf saved to:'), that.options.requireConfPath);

        deferred.resolve(data);
    });

    return deferred.promise;
};

module.exports = GenerateRequireConf;
