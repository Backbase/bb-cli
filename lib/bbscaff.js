var path = require('path');
var inquirer = require("inquirer");
var request = require('request');
var _ = require('lodash');
var chalk = require('chalk');

//Gulp Modules
var gulp = require('gulp');
var template = require('gulp-template');
var rename = require('gulp-rename');
var conflict = require('gulp-conflict');
var gulpFilter = require('gulp-filter');

var symbols = {
	ok: '✓',
	err: '✖',
	dot: '․'
}


var bbscaff = module.exports = function(template_dir){
	this.template_dir = template_dir
};

bbscaff.prototype.getCurrentBundle = function(){
	return process.cwd().split(path.sep).slice(-2)[0];
}

bbscaff.prototype.request = function(config, request_callback){
	request(_.extend({
		'auth': {
			'user': 'admin',
			'pass': 'admin'
		},
		method: 'POST',
		url: 'http://localhost:7777/portalserver/catalog',
		headers: {
			'Content-Type': 'application/xml'
		}
	}, config), request_callback)
}

bbscaff.prototype.generate = function(answers, destination_path, callback){
	var excludeImages = gulpFilter(['**/*', '!**/*.jpg', '!**/*.png', '!**/*.gif']);

	gulp.src(this.template_dir + '/**/*')
		.pipe(excludeImages)
		.pipe(template(answers))
		.pipe(excludeImages.restore())
		.pipe(rename(function(path){
			_.each(answers, function(answer, key){
				path.basename = path.basename.split('{' + key + '}').join(answer)
			})
		}))
		.pipe(conflict('./'))
		.pipe(gulp.dest(destination_path))
		.on('end', function(){
			if(typeof callback == 'function') callback()
		})
}

bbscaff.prototype.prompt = function(questions, callback){
	inquirer.prompt(questions, function(answers){
		if(typeof callback == 'function') callback(answers)
	})
}

bbscaff.prototype.toCamelCase = function(string) {
	return string.split(/[-_ \.]/).map(function(word){
		var wordArr = word.split('');
			wordArr[0] = wordArr[0].toUpperCase();
			return wordArr.join('')
		}).join('')
}

bbscaff.prototype.getPrefix = function(string){
	return string.split(/[-_ \.]/).map(function(word){return word.split('')[0]}).join('')
}

bbscaff.prototype.logError = function(msg){
	console.log(chalk.red(symbols.err + ' ') + chalk.gray(msg))
}

bbscaff.prototype.logSuccess = function(msg_white, msg_gray) {
	console.log(chalk.green(symbols.ok + ' ') + msg_white + ' ' + chalk.gray(msg_gray))
}
