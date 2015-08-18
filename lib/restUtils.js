var jxon = require('jxon');
var fs = require('fs-extra-promise');
var path = require('path');
var chalk = require('chalk');
var formattor = require('formattor');
var inquirer = require("inquirer");
var url = require('url');
var configLib = require('./config');

/**
 * Submit all components or only selected one
 *
 * @param {String} baseUrl - path to destination directory
 * @param {Object} componentsToInstall - object with list of custom bb components paths
 * @param {Boolean} [askBeforeSend] - set ti `true` if force submit is required, without a prompt
 * @param {String} [singleComponentPath] - specify component path to submit, if not defined, all components will be installed
 */
module.exports.submitToPortal = function(baseUrl, componentsToInstall, askBeforeSend, singleComponentPath){
    configLib.getCommon().then(function(r){
        inquirer.prompt([
            {
                type: 'confirm',
                name: 'send',
                message: 'Install all components to your portal?',
                default: false,
                when: function(){
                    return askBeforeSend;
                }
            }
        ], function(answers){
            if (!askBeforeSend || answers.send) {
                var bbrest = r.bbrest;

                console.log(chalk.green('Installing components via REST...'));
                if (singleComponentPath) {
                    submitDir(path.join(singleComponentPath), bbrest);
                } else if (componentsToInstall) {
                    for (var module in componentsToInstall) {
                        var modulePath = componentsToInstall[module];

                        submitDir(path.join(baseUrl, modulePath), bbrest);
                    }
                }
            }
        });
    });
};

/**
 * Submit all components or only selected one
 *
 * @param {String} dir - directory with xmls to submit
 * @param {Object} bbrest - configured bbrest instance
 */
var submitDir = module.exports.submitDir = function(dir, bbrest) {
    fs.readdirAsync(dir)
    .then(function(files) {
        files.sort();

        for (var i = 0; i < files.length; i++) {
            if (path.extname(files[i]) === '.xml') {
                submitFile(path.join(dir, files[i]), bbrest);
            }
        }
    })
    .fail(function(e) {
        console.log(chalk.red('lib/rest error: '), e);
    });
};

/**
 * Submit specified xml file
 *
 * @param {String} filePath - xml file path to deploy
 * @param {Object} bbrest - configured bbrest instance
 */
var submitFile = module.exports.submitFile = function (filePath, bbrest) {
    return bbrest.catalog().post(filePath)
        .then(function(r) {
            onResponse(r, bbrest);
        })
        .fail(function(e) {
            console.log(chalk.red('lib/rest error') + ' submiting file', e);
        });
};

/**
 * Parse API response
 *
 * @param {Object} r - response object
 * @param {Object} bbrest - configured bbrest instance
 * @param {Object} cfg - configuration
 */
var onResponse = module.exports.onResponse = function(r, bbrest, cfg) {
    cfg = cfg || {};

    var out = [chalk.green(r.method) + ' ' + chalk.gray(url.parse(r.href).pathname.substr(bbrest.config.context.length + 1))];
    var x;
    if (r.error) {
        out[0] += ' ' + chalk.red(r.statusCode) + ' ' + r.statusInfo;
        if (r.statusCode >= 400) {
            // method not allowed
            if (r.statusCode === 405) x = jxon.stringToJs(r.body).html.head.title;
            else x = jxon.stringToJs(r.body).errorMessage.message;
            out.push(chalk.red(x));
        } else {
            out.push(chalk.red(r.error));
        }
    } else {
        out[0] += ' ' + chalk.yellow(r.statusCode) + ' ' + r.statusInfo;
    }
    if (cfg.verbose) {
        out.push(chalk.bgWhite.black('REQUEST'));
        out.push('URL: ' + r.href);
        if (r.reqBody) {
            if (cfg.json) r.body = JSON.stringify(jxon.stringToJs(r.body));
            x = formattor(r.reqBody, {method: cfg.json ? 'json' : 'xml', step: '   '});
            out.push(chalk.gray(x.trim()));
        }

        out.push(chalk.bgWhite.black('HEADERS'));
        x = formattor(JSON.stringify(r.headers), {method: 'json', step: '    '});
        out.push(chalk.gray(x));

        out.push(chalk.bgWhite.black('RESPONSE'));
        if (r.body) {
            if (cfg.json) r.body = JSON.stringify(jxon.stringToJs(r.body));
            x = formattor(r.body, {method: cfg.json ? 'json' : 'xml', step: '   '});
            out.push(chalk.gray(x.trim()));
        }
    }
    //if (r.statusCode !== 302)
    console.log(out.join('\n'));
    if (!r.error && cfg.save) {
        x = formattor(r.body, {method: cfg.json ? 'json' : 'xml', step: '   '});
        fs.writeFileAsync(cfg.save, x)
        .then(function() {
            console.log('Saved to ' + cfg.save);
        });
    }
};
