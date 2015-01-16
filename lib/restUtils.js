var Q = require('q');
var jxon = require('jxon');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var readFile = Q.denodeify(fs.readFile);
var readDir = Q.denodeify(fs.readdir);
var formattor = require('formattor');
var BBRest = require('mosaic-rest-js');
var inquirer = require("inquirer");
var url = require('url');

// Submit all components or only selected one
module.exports.submitToPortal = function(baseUrl, componentsConfs, force, componentPath){
    // TODO: remember, if we already installed it before (or use only with --save)

    inquirer.prompt([
		{
			type: 'confirm',
            name: 'send',
            message: 'Install all components to your portal?',
            default: false,
            when: function(){
                return !force
            }
        },
		{
			type: 'input',
            name: 'portalName',
            message: 'Portal name:',
            default: 'dashboard',
            when: function(answers){
                return force || answers.send
            }
		}
	], function(answers){
        if (force || answers.send) {
            var bbrest = new BBRest();
            bbrest.config = {
                host: bbrest.config.host,
                port: bbrest.config.port,
                context: bbrest.config.context,
                username: bbrest.config.username,
                password: bbrest.config.password,
                portal: bbrest.config.portal || answers.portalName
            };

            var customComponents = componentsConfs.customComponents.paths;

            console.log(chalk.green('Installing components via REST...'));
            if (componentPath) {
                submitDir(componentPath, bbrest);
            } else if (customComponents) {
                for (var module in customComponents) {
                    var modulePath = customComponents[module];

                    submitDir(path.join(baseUrl, modulePath), bbrest);
                }
            }
        }
	});
};

var submitDir = module.exports.submitDir = function(dir, bbrest) {
    readDir(dir)
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

var submitFile = module.exports.submitFile = function(filePath, bbrest) {
    return bbrest.catalog().post(filePath)
        .then(function(r){
            onResponse(r, bbrest);
        })
        .fail(function(e) {
            console.log(chalk.red('lib/rest error') + ' submiting file', e);
        });
};

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
            out.push(chalk.bgRed(x));
        } else {
            out.push(chalk.bgRed(r.error));
        }
    } else {
        out[0] += ' ' + chalk.yellow(r.statusCode) + ' ' + r.statusInfo;
    }
    if (cfg.verbose) {
        out.push(chalk.bgWhite.black('REQUEST'));
        if (r.reqBody) {
            if (cfg.json) r.body = JSON.stringify(jxon.stringToJs(r.body));
            x = formattor(r.reqBody, {method: cfg.json? 'json' : 'xml', step: '   '});
            out.push(chalk.gray(x.trim()));
        }

        out.push(chalk.bgWhite.black('HEADERS'));
        x = formattor(JSON.stringify(r.headers), {method: 'json', step: '    '});
        out.push(chalk.gray(x));

        out.push(chalk.bgWhite.black('RESPONSE'));
        if (r.body) {
            if (cfg.json) r.body = JSON.stringify(jxon.stringToJs(r.body));
            x = formattor(r.body, {method: cfg.json? 'json' : 'xml', step: '   '});
            out.push(chalk.gray(x.trim()));
        }
    }
    //if (r.statusCode !== 302)
    console.log(out.join('\n'));
    if (!r.error && cfg.save) {
        x = formattor(r.body, {method: cfg.json? 'json' : 'xml', step: '   '});
        writeFile(cfg.save, x)
        .then(function() {
            console.log('Saved to ' + cfg.save);
        });
    }
};