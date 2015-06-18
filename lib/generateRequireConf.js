/* jshint -W061 */

'use strict';

var chalk = require('chalk');
var __ = require('lodash-contrib');
var _ = require('lodash');
var Q = require('q');
var fs = require('node-fs-extra');
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
function GenerateRequireConf(baseUrl, bowerJSON, bowerRc, bbRc) {
    this.options = {
        bowerJSON: bowerJSON,
        bowerOpts: bowerRc,
        bbRc: bbRc,
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

    // Getting only list of dep paths
    bower.commands.list({paths: true}, {cwd: that.baseUrl})
        .on('end', function (dependencyPaths) {
            var fsPaths = that.getFsPaths(dependencyPaths, that.options.bowerOpts);
            var bowerPaths = {
                paths: that.createRjsPaths(dependencyPaths, fsPaths)
            };

            // Compare bower paths with existing libs outside bower
            that.compareRequireConf(bowerPaths, that.options.bbRc.requirejsConfigs)
                .then(function(mergedConf){
                    return that.applyWebUrl.apply(that, [mergedConf, that.options.bbRc.requirejsBaseUrl]);
                })
                .then(function(generatedConf){
                    that.writeRequireConf.apply(that, [generatedConf]).then(function(){
                        deferred.resolve({
                            fsPaths: fsPaths,
                            generatedConf: generatedConf
                        });
                    });
                }).fail(function(err){
                    console.log(chalk.red('Something went wrong during RequireJS options generation: '), err);
                    console.log(err.stack);
                    deferred.reject(err);
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

GenerateRequireConf.prototype.createRjsPaths = function(bowerDepList, fsPaths) {
    var output = {};
    var that = this;
    var getFirstJs = function(value){
        var jsFiles = [];

        if (!_.isArray(value)) return;

        value.forEach(function(item){
            if (typeof item === 'string' && item.substr(item.length - 3) === '.js') {
                jsFiles.push(item);
            }
        });

        return jsFiles.length === 1 ? jsFiles[0] : undefined;
    };

    _.forOwn(bowerDepList, function (value, key) {
        if (that.options.bbRc.requirejsExcludes && that.options.bbRc.requirejsExcludes.indexOf(key) > -1) return;

        var _value = typeof value === 'string' ? value : getFirstJs(value);

        if (_value && _value.substr(_value.length - 3) === '.js') {
            output[key] = value.replace(/.js$/, '');
        } else {
            output[key] = fsPaths[key];
        }
    });

    return output;
};

GenerateRequireConf.prototype.getFsPaths = function(bowerDepList, bowerRc) {
    var output = {};

    _.forOwn(bowerDepList, function (value, key) {
        output[key] = bowerRc.directory + '/' + key;
    });

    return output;
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
            order++;

            if (!pathToConf && pathToConf === '') {
                goForNext();
                return;
            }

            that.readRequireConf(pathToConf).then(function(pathsConfObj){
                output = that.mergeRequireConf(output, pathsConfObj);

                goForNext();
            }).fail(function(err){
                console.log(chalk.yellow('Error reading RequireJS conf "' + pathToConf + '", skipping. Log: '), err);
                console.log(err.stack);

                goForNext();
            });
        };

        // Read first file
        goForNext();
    } else {
        deferred.resolve(output);
    }

    return deferred.promise;
};

/**
 * Replaces file system paths to web urls
 *
 * @param {Object} requireConf - generated require conf object
 * @param {String} requirejsBaseUrl - web url configuration
 *
 * @promise {Object} returns updated require conf object with web urls
 */
GenerateRequireConf.prototype.applyWebUrl = function(requireConf, requirejsBaseUrl){
    var output = requireConf;
    var deferred = Q.defer();
    var that = this;

    // Check if we have webUrl specified
    if (requirejsBaseUrl) {
        var basePath = __.hasPath(that.options, 'bowerOpts.directory') ? that.options.bowerOpts.directory : 'bower_components';

        // Prepare web paths
        _.forOwn(output.paths, function (value, key) {
            output.paths[key] = value.replace(basePath, requirejsBaseUrl);
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
