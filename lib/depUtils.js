var path = require('path');
var fs = require('node-fs-extra');
var chalk = require('chalk');

/**
 * Deletes defined component from bower dependencies directory
 *
 * @param {String} bowerPath - path to bower components directory
 * @param {String} component - name of the component
 */
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

/**
 * Get component name from Bower pkgMeta
 *
 * @param {String} componentEndpoint - installed component endpoint (name, git url etc)
 * @param {Object} pkgMeta - list of all installed components in current bower project
 *
 * @returns {String} Return component name or undefined
 */
module.exports.getComponentNameFromMeta = function(componentEndpoint, pkgMeta){
    var output;

    for(var key in pkgMeta.dependencies) {
        var value = pkgMeta.dependencies[key];

        if (value === componentEndpoint) output = key;
    }

    return output;
};

/**
 * Get
 *
 * @param {String} baseUrl - path to destination directory
 * @param {Object} bowerRc - .bowerrc configuration object
 *
 * @returns {String} Return path for generated require js conf
 */
module.exports.getRequireConfPath = function(baseUrl, bowerRc){
    var defaultPath = path.join(baseUrl, 'bower_components', 'require-bower-config.js');

    //? Declaring default path to bower
    //options.bowerOpts.directory = path.join(baseUrl, 'bower_components');

    return bowerRc.directory ? path.join(baseUrl, bowerRc.directory, 'require-bower-config.js') : defaultPath;
};
