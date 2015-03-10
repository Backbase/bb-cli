var path = require('path');
var inquirer = require("inquirer");
var _ = require('lodash');
var util = require('../lib/util');

//Gulp Modules
var gulp = require('gulp');
var template = require('gulp-template');
var rename = require('gulp-rename');
var conflict = require('gulp-conflict');
var gulpFilter = require('gulp-filter');

module.exports = {

    /**
     * Default template_dir is the templates root of the repo
     */
    template_dir: path.join(__dirname, '..', 'templates'),

    /**
     * Generate files based on input options and destination path
     * @param  {Object} answers Inquirer answers
     * @param  {String} options Destination path
     * @param  {Object} options Extended options
     */
    generate: function(answers, options, callback){

        var opts = _.isString(options) ? {destination_path: options} : options;

        options = _.extend({}, {
            template_dir: this.template_dir,
            destination_path: '',
            excludeFilter: ['.DS_Store'],
            srcOptions: {}
        }, opts);

        var src = [options.template_dir + '/**/*'].concat(options.excludeFilter.map(function(filter){
            return '!' + options.template_dir + '/' + filter;
        }));

        var excludedImages = gulpFilter(['**/*', '!**/*.jpg', '!**/*.png', '!**/*.gif'], options.srcOptions);

        gulp.src(src, options.srcOptions)
            .pipe(excludedImages)
            .pipe(template(answers, {interpolate: /<%=([\s\S]+?)%>/g}))
            .pipe(excludedImages.restore())
            .pipe(rename(function(path){
                _.each(options, answers, function(answer, key){
                    path.basename = path.basename.split('{' + key + '}').join(answer);
                });
            }))
            .pipe(conflict('./'))
            .pipe(gulp.dest(options.destination_path))
            .on('end', function(){
                if(_.isFunction(callback)){
                    callback();
                }
            });
    },

    /**
     * Get current bundle name based on user current folder on terminal
     * @return {String} current bundle name
     */
    getCurrentBundle: function(){
        return process.cwd().split(path.sep).slice(-2)[0];
    },

    /**
     * Wraps and exposes Inquirer prompt method
     * @param  {Object}   questions
     * @param  {Function} callback
     */
    prompt: function(questions, callback){
        inquirer.prompt(questions, function(answers){
            if(typeof callback === 'function') {
                callback(answers);
            }
        });
    },

    /**
     * Util: Return a camel case version of a string
     * @param  {String} string E.g. my-string
     * @return {String}        E.g. MyString
     */
    toCamelCase: function(string){
        return string.split(/[-_ \.]/).map(function(word){
            var wordArr = word.split('');
            wordArr[0] = wordArr[0].toUpperCase();
            return wordArr.join('');
        }).join('');
    },

    /**
     * Return prefix based on a string
     * @param  {String} string E.g. my-string
     * @return {String}        E.g. ms (first letter of each separation)
     */
    getPrefix: function(string){
        return string.split(/[-_ \.]/).map(function(word){
            return word.split('')[0];
        }).join('');
    },

    /**
     * Wraps chalk and fancy icons for error messages
     */
    logError: function(){
        return util.err.apply(this, arguments);
    },

    /**
     * Wraps chalk and fancy icons for success messages
     */
    logSuccess: function(){
        return util.ok.apply(this, arguments);
    }

};
