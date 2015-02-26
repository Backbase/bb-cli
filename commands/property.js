var Command = require('ronin').Command,
    Q = require('q'),
    fs = require('fs'),
    readDir = Q.denodeify(fs.readdir),
    config = require('../lib/config'),
    props = require('../lib/auto/props'),
    chalk = require('chalk'),
    bbrest, jxon, cfg;

module.exports = Command.extend({
  desc: 'Backbase CLI task automation.',
  help: function () {
    var title = chalk.bold;
    var d = chalk.gray;
    var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
    r += '\n\t Automates tasks during development of the components.';
    r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
    r += '      -p,  --prop\t\t\t\t\tSubmits changes of the widget propertie to the portal.\n';
    r += '      -f,  --file\t\t\t\t\tA file to target.\n';
    //r += '      -w,  --watch\t\t\t\t\tEnables watching for file change.\n';
    r += '      -v,  --verbose\t\t\t\t\tPrints detailed output.\n';
    /*
    r += '\n  ' + title('Examples') + ':\n\n';
    r += '      bb rest\t\t\t\t\t\tReturns portals defined on the server.\n';
    r += '      bb rest -t cache -T all -m delete\t\tDeletes all cache.\n';
    */
    r += '\n';
    return r;
  },

  options: {
    prop: {type: 'boolean', alias: 'p'},
    file: {type: 'string', alias: 'f'},
    watch: {type: 'boolean', alias: 'w'},
    verbose: {type: 'boolean', alias: 'v'}
  },

  run: function (prop, file, watch, verbose) {
    cfg = {
        prop: prop,
        file: file,
        watch: watch,
        verbose: verbose
    }
    config.getCommon()
    .then(function(r) {
        readDir(process.cwd())
        .then(function(files) {
            if (prop) props.init(r.bbrest, r.jxon, cfg, files);
        });
    });
  }
});

