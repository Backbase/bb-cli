var Command = require('ronin').Command;
var Q = require('q');
var fs = require('fs-extra');
var path = require('path');
var readFile = Q.denodeify(fs.readFile);
var readDir = Q.denodeify(fs.readdir);
var remove = Q.denodeify(fs.remove);
var inquirer = require('inquirer');
var utils = require('../lib/util');
var createLink = require('../lib/createLink');
var chalk = require('chalk');

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Symlinks source directory to target.\n\t  If --lp-trunk path is set, target will be: ';
        r += '\n\t    ' +  d('{lp path}/launchpad-bundles/static/launchpad/{bundle}/widgets/{package name}');
        r += '\n\n\t  If --lp-portal path is set, target will be: ';
        r += '\n\t    ' +  d('{cxp path}/src/main/webapp/static/launchpad/{bundle}/widgets/{package name}');
        r += '\n\t  If package name starts with `widget-` it will be stripped out.';
        r += '\n\n\t  If --cxp path is set, target will be: ';
        r += '\n\t    ' +  d('{cxp path}/src/main/webapp/static/widgets/{package name}');
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -s,  --source <string>\t\t' + d('current directory') + '\t Path to source directory.\n';
        r += '      -t,  --target <string>\t\t\t\t\t Path to directory in which to (un)link a source.\n';
        r += '           --lp-trunk <string>\t\t\t\t\t Path to `launchpad-trunk`.\n';
        r += '           --lp-portal <string>\t\t\t\t\t Path to portalserver containing lp.\n';
        r += '           --cxp <string>\t\t\t\t\t Path to portalserver.\n';
        r += '      -u,  --unlink\t\t' + '\t\t\t\t Unlink directory.\n';
        return r;
    },

    options: {
        source: {type: 'string', alias: 's'},
        target: {type: 'string', alias: 't'},
        unlink: {type: 'boolean', alias: 'u'},
        verbose: {type: 'boolean', alias: 'v'}
    },

    run: function () {
        var opts = this.options;
        var src = opts.source || process.cwd();
        var target;

        if (!opts.target && !opts['lp-portal'] && !opts['lp-trunk'] && !opts.cxp) {
            error(new Error('Target is not defined, see bb link --help'));
        } else {
            // if target is defined, do symlink
            if (opts.target) {
                if (opts.unlink) return remove(opts.target).fail(error);
                return doLink(src, opts.target).fail(error);
            // otherwise
            } else {
                return getManifest(src)
                .then(function(man) {
                    var name = man.name;
                    if (opts['lp-trunk'] || opts['lp-portal']) {
                        if (name.substr(0, 7) === 'widget-') {
                            name = name.substr(7);
                            var wdir = lpMap[name] || '';
                            wdir += '/widgets';
                        } else {
                            wdir = 'modules';
                        }
                        if (opts['lp-trunk'])
                            target = path.resolve(opts['lp-trunk'], 'launchpad-bundles/static/launchpad', wdir, name);
                        else
                            target = path.resolve(opts['lp-portal'], 'src/main/webapp/static/launchpad', wdir, name);
                    } else if (opts.cxp) {
                        target = path.resolve(opts.cxp, 'src/main/webapp/static/widgets', name);
                    }
                    if (opts.unlink) return remove(target).fail(error);
                    return doLink(src, target).fail(error);
                });
            }

        }
    }
});

function doLink(src, target) {
    var deferred = Q.defer();
    inquirer.prompt([{
        message: 'Symlink ' + chalk.gray(path.basename(src)) + ' to ' + chalk.gray(target) + ', which will be deleted if exists.',
        name: 'doit',
        type: 'confirm'
    }], function(answers) {
        if (answers.doit) {
            deferred.resolve(remove(target)
            .then(function() {
                return createLink(src, target)
                .then(function() {
                    utils.ok('Done.');
                });
            }));
        } else {
            deferred.reject(new Error('Canceled.'));
        }
    });
    return deferred.promise;
}

function error(err) {
    utils.err(chalk.red('bb link: ') + err.message);
    return err;
}

var manifestPromise;
// returns manifest data from bower.json or package.json from the given dir
function getManifest(dir) {
    if (manifestPromise) return manifestPromise;
    manifestPromise = readDir(dir)
    .then(function(files) {
        var ind, pack;
        if (((ind = files.indexOf('bower.json')) !== -1) || (ind = files.indexOf('package.json')) !== -1) {
            pack = files[ind];
        } else {
            return error(new Error('No bower.json or package.json in ' + dir));
        }
        return readFile(pack)
        .then(function(str) {
            return JSON.parse(str.toString());
        })
        .catch(function(e) {
            return error(new Error('Error reading manifest file ' + pack));
        });
    });
    return manifestPromise;
}

var lpMap = {
    accounts: 'banking',
    'accounts-dropdown': 'banking',
    addressbook: 'banking',
    'expense-planning': 'banking',
    'external-accounts': 'banking',
    'new-transfer': 'banking',
    'review-transfers': 'banking',
    transactions: 'banking',
    'transactions-new': 'banking',
    'transactions-overview': 'banking',
    'secure-messaging': 'messaging',
    'p2p-enrollment': 'p2p',
    'p2p-preferences': 'p2p',
    'p2p-tab': 'p2p',
    'p2p-transactions': 'p2p',
    budgets: 'pfm',
    'category-spending-chart': 'pfm',
    'saving-goals': 'pfm',
    'advanced-content-template': 'universal',
    'alert-messages': 'universal',
    'base-widget': 'universal',
    login: 'universal',
    navbar: 'universal',
    'navbar-advanced': 'universal',
    navfooter: 'universal',
    notifications: 'universal',
    places: 'universal',
    'profile-contact': 'universal',
    'profile-details': 'universal',
    'profile-preferences': 'universal',
    'profile-portfolio': 'universal',
    'profile-summary': 'universal',
    video: 'universal',
    'widget-catalog': 'universal',
    'widgets-catalog': 'universal'
};
