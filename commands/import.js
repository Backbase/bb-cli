var inquirer = require("inquirer");
var chalk = require('chalk');
var _ = require('lodash');
var util = require('../lib/util');
var bbmodel = require('../lib/bbmodel');
var importCXP = require('../lib/yapi/importCXP');

var clui = require('clui');
var loading = new clui.Spinner('Please wait...');
var Command = require('ronin').Command;

module.exports = Command.extend({
	desc: 'Imports portal model from xml files. Yapi CLI.',

	run: function () {
        //loading.start();

        //inquirer.prompt([{
        //        message: 'Please add different destination for you portal server if needed (url from config)',
        //        default: 'localhost:7777',
        //        name: 'url',
        //        type: 'input'
        //    }
            //,{
                //message: 'You are about to import your portal model',
                //name: 'confirm',
                //type: 'confirm'
            //}
            //],
            //function (answers) {
            //    console.log('asas');

                importCXP.startImport();

                //if (answers.confirm) {
                    //inquirer.prompt([{message: 'Sure?', name:'confirm', type: 'confirm'}], function(answers){
                    //    if(answers.confirm) {
                    //        console.log('sending to: ' + answers.url);//then
                    //        loading.stop()
                    //    }
                    //});
                //} else {
                //    util.err("you didn't say yes");
                //}
            //});
    }
});