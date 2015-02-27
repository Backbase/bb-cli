var Q = require('q');
var fs = require('fs-extra');
var path = require('path');
var readJson = Q.denodeify(fs.readJson);
var _ = require('lodash');
var chalk = require('chalk');
var BBRest = require('mosaic-rest-js');
var jxon = require('jxon');

var HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var iniDir;


exports.get = function(cliConfig) {
    var a = [exports.getGlobal(),
             exports.getBb(),
             exports.getBower(),
             exports.getBowerRc(),
             exports.getBbRc()
        ];

    return Q.all(a)
    .spread(function(g, c, b, brc, l) {
        var o = {
            global: g,
            bb: c,
            bower: b,
            bowerrc: brc,
            bbrc: l
        }
        if (cliConfig) o.cli = cliConfig;
        return o;
    });
}

exports.getGlobal = function() {
    return readJson(HOME + '/.backbase/bb-cli.json')
    .fail(function(e) {
        return {};
    });
}

exports.getBb = function() {
    return readJson('bb.json')
    .fail(function(e) {
        return {};
    });
}

exports.getBower = function() {
    return readJson('bower.json')
    .then(function(r) {
        if (typeof r.main === 'string') r.main = [r.main];
        return r;
    })
    .fail(function(e) {
        return {};
    });
}

exports.getBowerRc = function() {
    return readJson('.bowerrc')
    .fail(function(e) {
        return {};
    });
}

exports.getBbRc = function() {
    iniDir = process.cwd();
    return getNested('.bbrc')
    .then(function(r) {
        if (r.path) r.path = exports.absolutizePath(r.path);
        return r;
    })
    .fail(function(e) {
        return {};
    });
}

exports.absolutizePath = function(pth) {
    if (pth.substr(0, 1) === '~') pth = path.join(HOME, pth.substr(1));
    else if (!path.isAbsolute(pth)) {
        pth = path.join(process.cwd(), pth);
    }
    return path.normalize(pth);
}

exports.getCommon = function(cliConfig) {
    return exports.get(cliConfig)
    .then(function(config) {
        bbrest = new BBRest();
        // merge  .bbrc properties
        var cnames = ['host', 'port', 'context', 'username', 'password', 'portal'];
        _.merge(bbrest.config, _.pick(config.bbrc, cnames));
        bbrest.config.plugin = function (o) {return jxon.jsToString(o);};        

        jxon.config({
          valueKey: '_',        // default: 'keyValue'
          attrKey: '$',         // default: 'keyAttributes'
          attrPrefix: '$',      // default: '@'
          lowerCaseTags: false, // default: true
          trueIsEmpty: false,   // default: true
          autoDate: false       // default: true
        });
        return {
            config: config,
            bbrest: bbrest,
            jxon: jxon
        };
    })
}

function getNested(name, a, depth) {
    a = a || [];

    return readJson(name)
    .then(function(r) {
        a.push(r);
        return onRead(name, a, depth);
    })
    .fail(function(e) {
        // if no file, proceed
        if (e.code !== 'ENOENT') console.log(chalk.red('Error parsing file:'),  process.cwd() + '/' + name, e);
        return onRead(name, a, depth);
    });
}
function onRead(name, a, depth) {
    if (process.cwd() !== '/' && (depth !== undefined && depth > 0)) {
        process.chdir('..');
        if (depth !== undefined) depth--;
        return getNested(name, a, depth);
    } else {
        var o = {}, i;
        a.reverse();
        for (i = 0; i < a.length; i++) {
            _.merge(o, a[i]);
        }
        process.chdir(iniDir);
        return o;
    }
}

/*
// TEST
process.chdir('../test/mock1/nest');
exports.get(0)
.then(function(r) {
    console.log(r);
    console.log('done.');
});
*/
