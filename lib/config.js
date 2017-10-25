var Q = require('q');
var fs = require('fs-extra-promise');
var path = require('path');
var _ = require('lodash');
var chalk = require('chalk');
var BBRest = require('lib-bb-portal-rest').default;
var bbrestNodePlugin = require('@bb-cli/lib-bb-portal-rest-nodejs-plugin').default;
var jxon = require('jxon');

var HOME = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
var iniDir, bbrest;


exports.get = function (cliConfig) {
    var a = [
        exports.getBb(),
        exports.getBower(),
        exports.getBowerRc(),
        exports.getBbRc(cliConfig)
    ];

    return Q.all(a)
        .spread(function (c, b, brc, l) {
            var o = {
                bb: c,
                bower: b,
                bowerrc: brc,
                bbrc: l
            };
            if (cliConfig) o.cli = cliConfig;
            return o;
        });
};

exports.getBb = function () {
    return fs.readJsonAsync('bb.json')
        .catch(function () {
            return {};
        });
};

exports.getBower = function () {
    return fs.readJsonAsync('bower.json')
        .then(function (r) {
            if (typeof r.main === 'string') r.main = [r.main];
            return r;
        })
        .catch(function () {
            return {};
        });
};

exports.getBowerRc = function () {
    return fs.readJsonAsync('.bowerrc')
        .catch(function () {
            return {};
        });
};

exports.getBbRc = function (cliConfig) {
    var profile = cliConfig && cliConfig.profile || process.env.BBPROFILE;

    iniDir = process.cwd();
    return getNested('.bbrc', [], 100)
        .then(function(r) {
            if (profile && r.profiles && r.profiles[profile]) {
                // if profile exist, extend bbrc with profile properties
                _.merge(r, r.profiles[profile]);
            }
            if (r.path) r.path = exports.absolutizePath(r.path);
            return r;
        })
        .catch(function() {
            return {};
        });
};

exports.absolutizePath = function (pth) {
    if (pth.substr(0, 1) === '~') pth = path.join(HOME, pth.substr(1));
    else if (!path.isAbsolute(pth)) {
        pth = path.join(process.cwd(), pth);
    }
    return path.normalize(pth);
};

exports.getCommon = function (cliConfig) {
    return exports.get(cliConfig)
        .then(function (config) {

            var restConfig = {};
            // merge  .bbrc properties
            var cnames = ['scheme', 'host', 'port', 'context', 'username', 'password',
              'portal', 'verbose', 'authPath'];

            _.merge(restConfig, _.pick(config.bbrc, cnames));
            _.merge(restConfig, _.pick(config.cli, cnames));

            restConfig.plugin = bbrestNodePlugin;

            bbrest = BBRest(restConfig);
            var mwareOption = config.cli.middleware && config.cli.middleware.split(',');
            var mwares =  _.map(mwareOption, function(mwareName) {
                var mname = _.trim(mwareName);
                if (mname === 'default') return bbrest.config.middleware[0];
                var mwareFile = path.resolve(mname + '.js');
                try {
                    return require(mwareFile);
                } catch (err) {
                    throw new Error(chalk.red('Error ') + 'Cannot find middleware module \'' + mwareFile + '\'');
                }
            });
            if (mwares.length) bbrest.config.middleware = mwares;

            return bbrest.server().query({ps: 0}).get()
                .then(function() {
                    return {
                        config: config,
                        bbrest: bbrest,
                        jxon: jxon
                    };
                });
        })
        .catch(function(err) {
            if (err.statusInfo && err.statusInfo.indexOf('ECONNREFUSED') !== -1) {
                throw new Error(chalk.red('Error') + ' Connection refused. Check if CXP Portal is running.');
            }
            throw(err);
        });
};

function getNested(name, a, depth) {
    a = a || [];

    return fs.readJsonAsync(name)
        .then(function (r) {
            a.push(r);
            return onRead(name, a, depth);
        })
        .catch(function (e) {
            // if no file, proceed
            if (e.code !== 'ENOENT') console.log(chalk.red('Error parsing file:'), process.cwd() + '/' + name, e);
            return onRead(name, a, depth);
        });
}
function onRead(name, a, depth) {
    if (process.cwd() !== '/' && (depth !== undefined && depth > 0)) {
        process.chdir('..');
        if (depth !== undefined) depth--;
        return getNested(name, a, depth);
    } else {
        var i, o = {};
        a.reverse();
        for (i = 0; i < a.length; i++) {
            _.merge(o, a[i]);
        }
        process.chdir(iniDir);
        return o;
    }
}
