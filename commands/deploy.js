var Command = require('ronin').Command;
var path = require('path');
var spawn = require('cross-spawn');
var chalk = require('chalk');
var Finder = require('fs-finder');
var GenerateRequireConf = require('../lib/generateRequireConf');
var util = require('../lib/util');
var depUtils = require('../lib/depUtils');
var restUtils = require('../lib/restUtils');
var Q = require('q');
var fs = require('fs');
var inquirer = require('inquirer');

var baseUrl = process.cwd();

var preperaComponentPath = function(portalPath){
    var finalPath;
    var relativePath = path.relative(portalPath, baseUrl);

    if (relativePath.substring(0, 2) === '..') {
        finalPath = baseUrl;
    } else {
        finalPath = './' + relativePath;
    }

    return finalPath;
};

var getPortalPath = function(portalPath){
    var deferred = Q.defer();
    var errMsg = 'Could not find Project path';

    if (portalPath) {
        if (fs.existsSync(portalPath)) {
            deferred.resolve(portalPath);
        } else {
            deferred.reject(errMsg);
        }
    } else {
        Finder.in(path.dirname(baseUrl)).lookUp(util.getUserHome()).findFirst().findFiles('bower.json', function(file) {
            var checkPaths = ['portalserver','portal'];
            var fileDir = path.dirname(file);

            var guestProjectRoot = function(){
                var answer = false;

                checkPaths.forEach(function(item){
                    if (fs.existsSync(path.join(fileDir, item))) answer = true;
                });

                return answer;
            };

            if (file && guestProjectRoot()) {
                deferred.resolve(fileDir);
            } else {
                inquirer.prompt([
                    {
                        type: 'input',
                        name: 'portalPath',
                        message: 'Path to your project (pass --path next time):'
                    }
                ], function (answers) {
                    if (answers.portalPath) {
                        deferred.resolve(answers.portalPath);
                    } else {
                        deferred.reject(errMsg);
                    }
                });
            }
        });
    }

    return deferred.promise;
};

var deploy = function(portalPath, install){
    // Getting install target conf
    getPortalPath(portalPath)
        .then(function(portalPath){
            var deferred = Q.defer();

            depUtils.readBowerConfs(portalPath).then(function(bowerConfs){
                deferred.resolve({
                    portalPath: portalPath,
                    bowerConfs: bowerConfs
                });
            });

            return deferred.promise;
        })
        .then(function(conf){
            var options = depUtils.prepareOptions(conf.portalPath, conf.bowerConfs);
            var componentPath = preperaComponentPath(conf.portalPath);

            depUtils.cleanLocalComponent(path.join(conf.portalPath, options.bowerOpts.directory), baseUrl);

            spawn('bower', ['install', componentPath, '--config.cwd='+conf.portalPath], {stdio: 'inherit'}).on('close', function () {
                // Conf is generated for install target path
                var generateRJSConf = new GenerateRequireConf(options, conf.portalPath);

                console.log(chalk.gray('Bower install done, proceed to RequireJS conf generation...'));

                // Then we generate RequireJS conf
                // TODO: check if bower.json was changed, as speed matters here
                generateRJSConf.process().then(function(confs){
                    console.log(chalk.green('Component deploy done'));

                    if (install) {
                        restUtils.submitToPortal(baseUrl, confs, false, baseUrl);
                    }
                });
            });
        }).fail(function(err){
            console.log(chalk.red('Something went wrong, during Bower configuration read: '), err);
        });
};

var Deploy = Command.extend({
    desc: 'Deploys current module to your Backbase project',
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -P,  --path <string>\t\t' + d('/home/user/project-path') + '\t\tThe root path of your CXP project.\n';
        r += '      -I,  --install <boolean>\t\t' + d('false') + '\t\t\t\tInstall component via REAST after deploy.\n';
        r += '\n';
        return r;
    },
    options: {
        path: {type: 'string', alias: 'P'},
        install: {type: 'boolean', alias: 'I'}
    },

    run: deploy
});

module.exports = Deploy;
