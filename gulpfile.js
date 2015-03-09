var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jshintStylish = require('jshint-stylish');
var jscs = require('gulp-jscs');

gulp.task('jshint', function(){
    return gulp.src([
        'bin/*',
        'commands/**/*.js',
        'lib/**/*.js'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter(jshintStylish, {verbose: true}));
});

gulp.task('jscs', function(){
    return gulp.src([
        'bin/*',
        'commands/**/*.js',
        'lib/**/*.js'
    ])
    .pipe(jscs());
});

gulp.task('lint', ['jshint', 'jscs']);