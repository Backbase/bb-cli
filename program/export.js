var inquirer = require("inquirer");
var chalk = require('chalk');
var _ = require('lodash');
var util = require('../lib/util');
var bbmodel = require('../lib/bbmodel');

var clui = require('clui');
var loading = new clui.Spinner('Please wait...')

module.exports = function(program){
	program
		.command('export [portalName]')
		.description('export portal model into xml files. This files can be imported trough Yapi.')
		.action(function(portalName){

			if(!portalName) {
				bbmodel.listPortals(function(portals){
					inquirer.prompt([{message: 'Choose the portal you want to export', name: 'portal_name', type: 'list', choices: portals}], function(answers){
						loading.start()
						bbmodel.getPortalModel(answers.portal_name, function(xml){
							loading.stop()
							areYouSure(function(){
								bbmodel.exportPortal(xml, answers.portal_name, process.cwd(), function(file){
									util.ok(file)
								})
							})
						})
					})
				})
			} else {
				loading.start()
				bbmodel.getPortalModel(portalName, function(xml){
					loading.stop()
					if(xml) {
						areYouSure(function(){
							bbmodel.exportPortal(xml, portalName, process.cwd(), function(file){
								util.ok(file)
							})
						})
					} else {
						util.err("Portal doesn't exist or cannot be exported.")
					}
				})
			}

			function areYouSure(cb){
				inquirer.prompt([{message: 'You are about to export your portal model into ' + chalk.inverse(process.cwd()) + '. ' + chalk.red('This may override your files. Are you sure?'), name: 'confirm', type: 'confirm'}], function(answers){
					if(answers.confirm) cb()
				})
			}
		})
}