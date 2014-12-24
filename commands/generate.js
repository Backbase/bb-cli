var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var _ = require('lodash');
var Table = require('cli-table');
var map = require('map-stream');
var gulp = require('gulp');

var util = require('../lib/util');
var bbscaff = require('../lib/bbscaff');

var homeDir = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
var templatesDir = [
	path.join(homeDir, '.bbscaff'),
	path.join(__dirname, '..', 'templates')
];

var Command = require('ronin').Command;

module.exports = Command.extend({
	desc: 'scaffold widgets and containers',

	run: function (portal_url, authentication, template_name) {
		if(!template_name) return listTemplates();

		var tmpl_path = _.find(templatesDir, function(tmpl_path){
			return fs.existsSync(path.join(tmpl_path, template_name, 'bbscaff.js'))
		})

		if(tmpl_path){
			console.log(chalk.gray('Generating ' + template_name + ' on path: ' + process.cwd()))
			require(path.join(tmpl_path, template_name, 'bbscaff'))(new bbscaff(path.join(tmpl_path, template_name, 'template')))
		} else {
			listTemplates()
		}
	}
});


function listTemplates(){
	console.log(chalk.green('Available templates:'))
	console.log(chalk.gray('Note: templates defined in your home folder overrides default templates.'))

	var foundTemplates = [];

	var table = new Table({
		head: ['Template name', 'Path']
	});

	gulp.src(templatesDir.map(function(tmpl){ return path.join(tmpl, '**', 'bbscaff.js') }))
		.pipe(map(function(file, cb){
			var templatePath = path.dirname(file.path);
			var templateName = _.last(templatePath.split(path.sep));

			if(_.indexOf(foundTemplates, templateName) == -1) {
				table.push([templateName, chalk.gray(templatePath)])
			}

			foundTemplates.push(templateName)
			cb();
		}))
		.on('end', function(){
			console.log(table.toString());
		})
}