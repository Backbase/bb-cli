var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jshintStylish = require('jshint-stylish');
var jscs = require('gulp-jscs');
var mocha = require('gulp-mocha');

var jsFiles = [
    'commands/**/*.js',
    'lib/**/*.js'
];

gulp.task('test', function () {
    return gulp.src('test/**/*.js', {read: false})
        .pipe(mocha());
});

gulp.task('jshint', function(){
    return gulp.src(jsFiles)
        .pipe(jshint())
        .pipe(jshint.reporter(jshintStylish, {verbose: true}));
});

gulp.task('jscs', function(){
    return gulp.src(jsFiles)
        .pipe(jscs());
});

gulp.task('default', ['test', 'jshint', 'jscs']);
