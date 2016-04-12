var util = require('../lib/util');
var restUtils = require('../lib/restUtils');
var Command = require('ronin').Command;
var Q = require('q');
var chalk = require('chalk');
var _ = require('lodash');
var config = require('../lib/config');
var yapi = require('../lib/yapi/importCXP');

module.exports = Command.extend({
    desc: 'YAPI CLI',
    help: function () {
        var title = chalk.bold;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Command line version of Backbase YAPI library.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n\n';
        r += '      -s,  --search <string>\t\t' + d('*.xml') + '\t\tThe scheme of the rest api call.\n';

        return r;
    },

    options: util.buildOpts({
        search: {type: 'string', alias: 's'}
    }),

    run: function () {
        return yapi.startImport(this.options);
    }
});
