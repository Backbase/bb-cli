var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jshintStylish = require('jshint-stylish');
var jscs = require('gulp-jscs');
var mocha = require('gulp-mocha');

var src = [
    'bin/*',
    'commands/**/*.js',
    'lib/**/*.js',
    // Till the merge of PR #26
    '!commands/export.js',
    '!lib/bbmodel.js'
];

gulp.task('test', function () {
    return gulp.src('test/**/*.js', {read: false})
        .pipe(mocha());
});

gulp.task('jshint', function(){
    return gulp.src(src)
        .pipe(jshint())
        .pipe(jshint.reporter(jshintStylish, {verbose: true}));
});

gulp.task('jscs', function(){
    return gulp.src(src)
        .pipe(jscs());
});

gulp.task('default', ['test', 'jshint', 'jscs']);
