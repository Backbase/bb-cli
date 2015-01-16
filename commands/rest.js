var restUtils = require('../lib/restUtils');
var Command = require('ronin').Command,
    BBRest = require('mosaic-rest-js'),
    Q = require('q'),
    jxon = require('jxon'),
    fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    _ = require('lodash'),
    readFile = Q.denodeify(fs.readFile),
    readDir = Q.denodeify(fs.readdir),
    writeFile = Q.denodeify(fs.writeFile),
    ask = Q.denodeify(require('asking').ask),
    config = require('./config'),
    bbrest, cfg;

jxon.config({
  valueKey: '_',        // default: 'keyValue'
  attrKey: '$',         // default: 'keyAttributes'
  attrPrefix: '$',      // default: '@'
  lowerCaseTags: false, // default: true
  trueIsEmpty: false,   // default: true
  autoDate: false       // default: true
});

module.exports = Command.extend({
  desc: 'Backbase REST API CLI',
  help: function () {
    var title = chalk.bold;
    var d = chalk.gray;
    var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
    r += '\n\t Command line version of Backbase Rest API library. https://github.com/Backbase/mosaic-rest-js';
    r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
    r += '      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
    r += '      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
    r += '      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
    r += '      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.\n';
    r += '      -w,  --password <string>\t\t' + d('admin') + '\t\tPassword.\n';
    r += '      -p,  --portal <string>\t\t\t\tName of the portal on the server to target.\n';
    r += '      -t,  --target <string>\t\t' + d('server') + '\t\tContext target: server, portal, catalog, page, container, widget, link, template, user, group, audit or cache.\n';
    r += '      -T,  --target-arg <string/json>\t\t\tTarget arguments. When there are more arguments, pass JSON array.\n';
    r += '      -m,  --method <string>\t\t' + d('get') + '\t\tHTTP method to use: get, post, put or delete.\n';
    r += '      -f,  --file <string/json>\t\t\t\tPath of the file to send. Or JSON string when using mosaic-xml-js.\n';
    r += '      -r,  --rights\t\t\t\t\tTargets context rights.\n';
    r += '      -g,  --tags\t\t\t\t\tTargets context tags.\n';
    r += '      -q,  --query <json>\t\t\t\tSets query string.\n';
    r += '      -v,  --verbose\t\t\t\t\tPrints detailed output.\n';
    r += '      -s,  --save <string>\t\t\t\tSaves response into file.\n';
    r += '\n  ' + title('Examples') + ':\n\n';
    r += '      bb rest\t\t\t\t\t\tReturns portals defined on the server.\n';
    r += '      bb rest -t cache -T all -m delete\t\tDeletes all cache.\n';
    r += '\n';
    return r;
  },

  options: {
    host: {type: 'string', alias: 'H'},
    port: {type: 'string', alias: 'P'},
    context: {type: 'string', alias: 'c'},
    username: {type: 'string', alias: 'u'},
    password: {type: 'string', alias: 'w'},
    portal: {type: 'string', alias: 'p'},
    target: {type: 'string', alias: 't', default: 'server'},
    "target-arg": {type: 'string', alias: 'T'},
    method: {type: 'string', alias: 'm', default: 'get'},
    file: {type: 'string', alias: 'f'},
    rights: {type: 'boolean', alias: 'r'},
    tag: {type: 'boolean', alias: 'g'},
    query: {type: 'string', alias: 'q'},
    verbose: {type: 'boolean', alias: 'v'},
    json: {type: 'boolean', alias: 'j'},
    save: {type: 'string', alias: 's'}
  },

  run: function (host, port, context, username, password, portal, target, targetArg, method, file, rights, tag, query, verbose, json, save) {
    bbrest = new BBRest();
    // TODO: find portal name from config.json
    bbrest.config = {
        host: host || bbrest.config.host,
        port: port || bbrest.config.port,
        context: context || bbrest.config.context,
        username: username || bbrest.config.username,
        password: password || bbrest.config.password,
        portal: portal || bbrest.config.portal
    }
    cfg = {
        target: target,
        targetArg: tryParseJSON(targetArg) || [targetArg],
        method: method,
        file: tryParseJSON(file) || file,
        rights: rights,
        tag: tag,
        query: tryParseJSON(query),
        verbose: verbose,
        json: json,
        save: save
    }

    sendRequest().then(function() {
    }).fail(function(e) {
        logError(e);
    }).done();
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
};
function logError(e) {
    console.log(chalk.red('right error'), e);
}
function sendRequest(creq) {
    cfg = creq || cfg;

    if (cfg.portal) bbrest.config.portal = cfg.portal;
    if (['server', 'user', 'group', 'audit', 'cache', 'catalog'].indexOf(cfg.target) === -1 && !bbrest.config.portal)
        throw new Error('portal is not defined');
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
    return r[cfg.method](cfg.file)
    .then(function(r){
        restUtils.onResponse(r, bbrest, cfg);
    });
}
