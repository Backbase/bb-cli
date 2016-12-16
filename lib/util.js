'use strict';

var _ = require('lodash');
var clui = require('clui');
var chalk = require('chalk');
var moment = require('moment');

exports.backbase = function () {
    console.log(chalk.gray([' ____             _    _                     ', '| __ )  __ _  ___| | _| |__   __ _ ___  ___  ', '|  _ \\ / _` |/ __| |/ / \'_ \\ / _` / __|/ _ \\ ', '| |_) | (_| | (__|   <| |_) | (_| \\__ \\  __/ ', '|____/ \\__,_|\\___|_|\\_\\_.__/ \\__,_|___/\\___| '].join('\n') + '\n'));
};

exports.ok = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args[1]) {
        args[1] = chalk.gray(args[1]);
    }
    args.unshift(chalk.gray('[' + moment().format('YYYY-MM-DD HH:mm:ss:SSS') + ']'));
    args.unshift(chalk.green('✓'));
    console.log.apply(this, args);
};

exports.warn = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args[1]) {
        args[1] = chalk.gray(args[1]);
    }
    args.unshift(chalk.gray('[' + moment().format('YYYY-MM-DD HH:mm:ss:SSS') + ']'));
    args.unshift(chalk.yellow('!'));
    console.log.apply(this, args);
};

exports.err = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args[1]) {
        args[1] = chalk.gray(args[1]);
    }
    args.unshift(chalk.gray('[' + moment().format('YYYY-MM-DD HH:mm:ss:SSS') + ']'));
    args.unshift(chalk.red('✖'));
    console.log.apply(this, args);
};

exports.getUserHome = function () {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
};

exports.buildOpts = function(opts){
    return _.extend({
        host: {type: 'string', alias: 'H'},
        port: {type: 'string', alias: 'P'},
        portal: {type: 'string', alias: 'p'},
        context: {type: 'string', alias: 'c'},
        username: {type: 'string', alias: 'u'},
        password: {type: 'string', alias: 'w'},
        authPath: {type: 'string', alias: 'A'}
    }, opts);
};

exports.spin = new clui.Spinner('Please wait...');
