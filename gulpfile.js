var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jshintStylish = require('jshint-stylish');
var jscs = require('gulp-jscs');

var src = [
    'bin/*',
    'commands/**/*.js',
    'lib/**/*.js'
];

gulp.task('jshint', function(){
    return gulp.src(src)
        .pipe(jshint())
        .pipe(jshint.reporter(jshintStylish, {verbose: true}));
});

gulp.task('jscs', function(){
    return gulp.src(src)
        .pipe(jscs());
});

gulp.task('default', ['jshint', 'jscs']);
