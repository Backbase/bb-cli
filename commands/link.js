var Command = require('ronin').Command;
var Q = require('q');
var fs = require('fs-extra');
var path = require('path');
var readFile = Q.denodeify(fs.readFile);
var readDir = Q.denodeify(fs.readdir);
var remove = Q.denodeify(fs.remove);
var lstat = Q.denodeify(fs.lstat);
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
        r += '      -f,  --force\t\t' + '\t\t\t\t Force removal of the target.\n';
        r += '      -u,  --unlink\t\t' + '\t\t\t\t Remove symlink.\n';
        return r;
    },

    options: {
        source: {type: 'string', alias: 's'},
        target: {type: 'string', alias: 't'},
        'lp-trunk': {type: 'string'},
        'lp-portal': {type: 'string'},
        cxp: {type: 'string'},
        force: {type: 'boolean', alias: 'f'},
        unlink: {type: 'boolean', alias: 'u'}
    },

    run: function () {
        var opts = this.options;
        var src = opts.source || process.cwd();
        var target;

        if (!opts.target && !opts['lp-portal'] && !opts['lp-trunk'] && !opts.cxp) {
            return error(new Error('Target must be defined.'));
        } else {
            // if target is defined, do symlink
            if (opts.target) {
                if (opts.unlink) return doUnlink(opts.target).catch(error);
                return doLink(src, opts.target, opts).catch(error);
            // otherwise
            } else {
                return getManifest(src)
                .then(function(man) {
                    var name = man.name;
                    if (opts['lp-trunk'] || opts['lp-portal']) {
                        if (name.substr(0, 7) === 'widget-') {
                            name = name.substr(7);
                            var wdir = lpMap[name] || '';
                            wdir += wdir ? '/widgets' : 'widgets';
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
                    if (opts.unlink) return doUnlink(target);
                    return doLink(src, target, opts);
                })
                .catch(error);
            }

        }
    }
});

function doLink(src, target, opts) {
    return removeTarget(target, opts)
    .then(function() {
        console.log('Linking \'' + chalk.gray(path.basename(src)) + '\' to \'' + chalk.gray(target) + '\'');
        return createLink(src, target)
        .then(function() {
            utils.ok('Done.');
        });
    });
}

function doUnlink(target) {
    return lstat(target)
        .then(function(stats) {
            if (stats.isSymbolicLink()) {
                console.log('Removing ' + chalk.gray(target));
                return remove(target)
                .then(function() {
                    utils.ok('Done.');
                });
            } else {
                throw new Error(chalk.gray(target) + ' is not a symlink.');
            }
        })
    .catch(function(e) {
        if (e.code === 'ENOENT') throw new Error(chalk.gray(target) + ' does not exist.');
        throw e;
    });
}

// if target exists fails, if forced removes it
function removeTarget(target, opts) {
    return lstat(target)
    .then(function(stats) {
        if (!opts.force) throw new Error('Target ' + chalk.gray(target) + ' exists. Use ' + chalk.bold('--force') + ' flag to remove it before linking.');
        console.log('Removing ' + chalk.gray(target));
        return remove(target);
    })
    .catch(function(e) {
        if (e.code === 'ENOENT') return true;
        throw e;
    });
}

function error(err) {
    utils.err(chalk.red('bb link: ') + err.message);
    throw err;
}

// returns manifest data from bower.json or package.json from the given dir
function getManifest(dir) {
    return readDir(dir)
    .then(function(files) {
        var ind, pack;
        if (((ind = files.indexOf('bower.json')) !== -1) || (ind = files.indexOf('package.json')) !== -1) {
            pack = files[ind];
        } else {
            throw new Error('No bower.json or package.json found on target path: ' + chalk.green(dir));
        }
        return readFile(pack)
        .then(function(str) {
            return JSON.parse(str.toString());
        })
        .catch(function() {
            throw new Error('Error reading manifest file ' + pack);
        });
    });
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
    'transactions-search': 'banking',
    'transactions-list': 'banking',
    'transactions-chart-donut': 'banking',
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
