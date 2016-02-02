var restUtils = require('../lib/restUtils');
var Command = require('ronin').Command;
var Q = require('q');
var chalk = require('chalk');
var _ = require('lodash');
var config = require('../lib/config');
var bbrest, cfg;

module.exports = Command.extend({
    desc: 'Backbase REST API CLI',
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Command line version of Backbase Rest API library. https://github.com/Backbase/mosaic-rest-js';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -S,  --scheme <string>\t\t' + d('http') + '\t\tThe scheme of the rest api call.\n';
        r += '      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.\n';
        r += '      -pw,  --password <string>\t\t' + d('admin') + '\t\tPassword.\n';
        r += '      -p,  --portal <string>\t\t\t\tName of the portal on the server to target.\n';
        r += '      -t,  --target <string>\t\t' + d('server') + '\t\tContext target: server, portal, catalog, portalCatalog, page, container, widget, link, template, user, group, audit or cache.\n';
        r += '      -T,  --target-arg <string/json>\t\t\tTarget arguments. When there are more arguments, pass JSON array.\n';
        r += '      -m,  --method <string>\t\t' + d('get') + '\t\tHTTP method to use: get, post, put or delete.\n';
        r += '      -f,  --file <string/json>\t\t\t\tPath of the file to send. Or JSON string when using mosaic-xml-js.\n';
        r += '      -r,  --rights\t\t\t\t\tTargets context rights.\n';
        r += '      -g,  --tags\t\t\t\t\tTargets context tags.\n';
        r += '      -q,  --query <json>\t\t\t\tSets query string.\n';
        r += '      -x,  --empty-cache\t\t\t\tShortcut to empty all server caches.\n';
        r += '      -v,  --verbose\t\t\t\t\tPrints detailed output.\n';
        r += '      -s,  --save <string>\t\t\t\tSaves response into file.\n';
        r += '      -i,  --info\t\t\t\t\tDisplays REST API call information.\n';
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb rest\t\t\t\t\t\tReturns portals defined on the server.\n';
        r += '      bb rest -t catalog -T zak -m delete\t\tDeletes item zak from the server.\n';
        r += '      bb rest -x\t\t\t\t\tDeletes all cache. Same as: bb rest -t cache -T all -m delete\n';
        return r;
    },

    options: util.buildOpts({
        scheme: {type: 'string', alias: 'S'},
        target: {type: 'string', alias: 't', default: 'server'},
        'target-arg': {type: 'string', alias: 'T'},
        method: {type: 'string', alias: 'm', default: 'get'},
        file: {type: 'string', alias: 'f'},
        rights: {type: 'boolean', alias: 'r'},
        tag: {type: 'boolean', alias: 'g'},
        query: {type: 'string', alias: 'q'},
        'empty-cache': {type: 'boolean', alias: 'x'},
        verbose: {type: 'boolean', alias: 'v'},
        json: {type: 'boolean', alias: 'j'},
        save: {type: 'string', alias: 's'},
        info: {type: 'boolean', alias: 'i'},
        portal: {type: 'string', alias: 'p'}
    }),

    run: function () {

        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;

            cfg = r.config.cli;

            if (cfg.info) logInfo(bbrest.config);

            cfg.targetArg = tryParseJSON(cfg['target-arg']) || [cfg['target-arg']];
            cfg.file = tryParseJSON(cfg.file) || cfg.file;
            cfg.query = tryParseJSON(cfg.query);

            if (cfg.x) {
                _.extend(cfg, {
                    target: 'cache',
                    targetArg: ['all'],
                    method: 'delete'
                });
            }

            return sendRequest().then(function() {
            }).fail(function(e) {
                console.log(chalk.red('bb rest'), e);
            }).done();
        });

    }
});
function tryParseJSON (jsonString){
    try {
        var o = JSON.parse(jsonString);

        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns 'null', and typeof null === "object",
        // so we must check for that, too.
        if (o && typeof o === "object" && o !== null) {
            return o;
        }
    }
    catch (e) { }

    return false;
}
function sendRequest(creq) {
    var d = Q.defer();
    try {
        cfg = creq || cfg;

        if (cfg.portal) bbrest.config.portal = cfg.portal;
        if (['server', 'user', 'group', 'audit', 'cache', 'catalog', 'template'].indexOf(cfg.target) === -1 && !bbrest.config.portal) {
            throw new Error('portal is not defined');
        }
        var r = bbrest[cfg.target];

        if (cfg.rights) {
            r = r.apply(bbrest, cfg.targetArg).rights();
        } else if (cfg.tag) {
            r = r.call(bbrest).tag;
            if (cfg.targetArg) r = r.apply(r, cfg.targetArg);
        } else if (cfg.targetArg) {
            r = r.apply(bbrest, cfg.targetArg);
        } else {
            r = r.call(bbrest);
        }
        if (cfg.query) r = r.query(cfg.query);
        d.resolve(true);
    } catch(e) {
        d.reject(e);
    } finally {
        return d.promise.then(function() {
            return r[cfg.method](cfg.file)
            .then(function(r){
                restUtils.onResponse(r, bbrest, cfg);
            });
        });
    }
}

function logInfo(restConfig, indent) {
    indent = indent || '';
    var out = [];
    var later = [];
    var lengthMax = 0;
    _.each(restConfig, function(val, key) {
        if (typeof val === 'object') {
            if (!(val instanceof Array) && val !== null) {
                later.push([key, val]);
                return;
            }
        } else if (typeof val === 'function') {
            val = '[Function]';
        }
        if (lengthMax < key.length) lengthMax = key.length;
        out.push([indent, key, '  ', chalk.gray(val)]);
    });
    _.each(out, function(log) {
        log[2] = getSpaces(lengthMax - log[1].length);
        console.log.apply(this, log);
    });
    _.each(later, function(larr) {
        console.log(indent, chalk.underline(larr[0]));
        logInfo(larr[1], indent + '  ');
    });
}
function getSpaces(len) {
    var out = '';
    for (var i = 0; i < len; i++) out += ' ';
    return out;
}
