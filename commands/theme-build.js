
var Q = require('q');
var Command = require('ronin').Command;
var gulp = require('gulp');
var rename = require('gulp-rename');
var less = require('gulp-less');
var path = require('path');
var glob = require('glob');
var fs = require('fs');
var util = require('lodash');
var sourcemaps = require('gulp-sourcemaps');
var gulpif = require('gulp-if');
var mqRemove = require('gulp-mq-remove');
var rework = require('gulp-rework');
var debug = require('gulp-debug');
var minifyCss = require('gulp-minify-css');

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\n\t Builds a theme. Requires a bower.json file in the directory ';
        r += 'with a "main" pointing to the base less file';
        r += '      -t,  --target <string>\t\t\t\t\t Path to directory to build.\n';
        r += '      -e,  --edition <string>\t\t\t\t\t Pass edition var to less.\n';
        r += '      -b,  --base-path <string>\t\t\t\t\t Pass base-path var to less.\n';
        r += '      -s   --sourcemasp <string>\t\t\t\t\t Whether to generate source maps.\n';
        return r;
    },

    options: {
        target: {type: 'string', alias: 't'},
        edition: {type: 'string', alias: 'e'},
        'base-path': {type: 'string', alias: 'b'},
        sourcemaps: {type: 'flag', alias: 's'},
        dist: {type: 'string', alias: 'd'}
    },

    run: function () {
        var opts = this.options;
        var target = opts.target || process.cwd();
        var bowerFiles = target + '/**/bower.json';
        var ignore = [ target + '/**/bower_components/**', target + '/**/node_modules/**' ];
        opts.dist = opts.dist || 'dist';

        // Find bower.json files, as entry for themes.
        glob(bowerFiles, { ignore: ignore }, function(err, files) {
            files.forEach(function(f) {
                fs.readFile(f, function(err, bowerJson) {
                    var bowerParsed = JSON.parse(bowerJson.toString());
                    var entry = bowerParsed.main;
                    if (!util.isArray(entry)) {
                        entry = [ entry ];
                    }

                    // Css files to rework are the less files, but with .css extension,
                    // and are in the dist.
                    var reworkCssEntry = entry.map(function(f) {
                        f = distDirname(f, opts.dist);
                        return f.replace(/\.less$/, '.css');
                    });
                    var doReworkIe = util.partial(reworkIe, reworkCssEntry, target);

                    // Compress files are the CSS and the ie.css files.
                    var compressCssEntry = util.union(reworkCssEntry, reworkCssEntry.map(function(f) {
                        return f.replace(/\.css$/, '.ie.css');
                    }));
                    var doCompress = util.partial(compress, compressCssEntry, target);

                    // Run.
                    compile(entry, target, opts)
                        .then(doReworkIe)
                        .then(doCompress)
                        .catch(function(err) {
                            console.log(err);
                        });
                });
            });
        });
    }
});

function compile(entry, target, opts) {
    var deferred = Q.defer();

    gulp.src(entry, {base: target})
        .pipe(gulpif(function() { return !!opts.sourcemaps; },
            sourcemaps.init()
        ))
        .pipe(debug({title: 'compiling'}))
        .pipe(less({
            'modifyVars': util.merge({}, { // use opts if defined.
                'edition': opts.edition,
                'base-path': opts['base-path']
            })
        }))
        .pipe(rename(function(path) {
            path.dirname = distDirname(path.dirname, opts.dist)
            
        }))
        .pipe(gulpif(function() { return !!opts.sourcemaps; },
            sourcemaps.write('.') // write to same dir as CSS
        ))
        .pipe(debug({title: 'writing'}))
        .pipe(gulp.dest('.'))
        .on('error', deferred.reject)
        .on('end', deferred.resolve);

    return deferred.promise;
}

function distDirname(dirname, dist) {
    return dirname.replace('styles', path.join(dist, 'styles'));
}

function reworkIe(entry, target) {
    // Helper function to rework CSS for IE8.
    function reworkIe8(ast, reworkInstance) {
        // Push custom rule for IE8 to prevent responsiveness.
        ast.rules.push({
            'type' : 'rule',
            'selectors' : ['.container-fluid'],
            'declarations' : [
                {
                    'type' : 'declaration',
                    'property' : 'min-width',
                    'value' : '1024px'
                    }
                ]
        });
    }

    // Create .ie.css for ie8 support (TODO: drop ie8 support).
    var deferred = Q.defer();

    gulp.src(entry, {base: target})
        .pipe(debug({title: 'reworking'}))
        .pipe(rename({
            suffix: '.ie',
            extname: '.css'
        }))
        .pipe(mqRemove({width:'1024px'}))
        .pipe(rework(reworkIe8))
        .pipe(debug({title: 'writing'}))
        .pipe(gulp.dest(target))
        .on('error', deferred.reject)
        .on('end', deferred.resolve);

    return deferred;
}

function compress(entry, target) {
    var deferred = Q.defer();

    gulp.src(entry, {base:target})
        .pipe(debug({title: 'compressing'}))
        .pipe(minifyCss({keepBreaks: true}))
        .pipe(rename({
            suffix: '.min',
            extname: '.css'
        }))
        .pipe(debug({title: 'writing'}))
        .pipe(gulp.dest(target))
        .on('error', deferred.reject)
        .on('end', deferred.resolve);

    return deferred;
}
