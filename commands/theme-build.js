
var Q = require('q');
var Command = require('ronin').Command;
var gulp = require('gulp');
var rename = require('gulp-rename');
var less = require('gulp-less');
var path = require('path');
var glob = Q.denodeify(require('glob'));
var fs = require('fs-extra-promise');
var _ = require('lodash');
var util = require('../lib/util');
var sourcemaps = require('gulp-sourcemaps');
var gulpif = require('gulp-if');
var mqRemove = require('gulp-mq-remove');
var rework = require('gulp-rework');
var debug = require('gulp-debug');
var minifyCss = require('gulp-minify-css');
var chalk = require('chalk');
var through = require('through2');
var merge = require('gulp-merge');

var ImportItem = require('./import-item');
var importCmd = new ImportItem();

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\n\t Builds a theme. Requires a bower.json file in the directory ';
        r += 'with a "main" pointing to the base less file\n\n';
        r += '      -t,  --target <string>\t\t\t\t Path to directory to build.\n';
        r += '      -e,  --edition <string>\t\t\t\t Pass edition var to less.\n';
        r += '      -b,  --base-path <string>\t\t\t\t Pass base-path var to less.\n';
        r += '      -s   --sourcemaps\t\t\t\t\t Whether to generate source maps.\n';
        r += '      -w   --watch\t\t\t\t\t Watch less files and rebuild on change.\n';
        r += '           --disable-compress\t\t\t\t Don\'t compress CSS into .min files.\n';
        r += '           --disable-ie\t\t\t\t\t Don\'t create reworked .ie files for IE8.\n';
        r += '           --disable-assets\t\t\t\t Don\'t collect font/image assets.\n';
        r += '      -i   --import\t\t\t\t\t Run bb import-item after building.\n';
        return r;
    },

    options: {
        target: {type: 'string', alias: 't'},
        edition: {type: 'string', alias: 'e'},
        'base-path': {type: 'string', alias: 'b'},
        sourcemaps: {type: 'flag', alias: 's'},
        watch: {type: 'flag', alias: 'w'},
        dist: {type: 'string', alias: 'd'},
        'disable-compress': {type: 'flag'},
        'disable-ie': {type: 'flag'},
        'disable-assets': {type: 'flag'},
        'import': {type: 'flag', alias: 'i'}
    },

    run: function () {
        var opts = this.options;

        opts.target = (opts.target) ? path.resolve(opts.target) : process.cwd();
        opts.dist = opts.dist || 'dist';

        var bowerFiles = opts.target + '/**/bower.json';
        var ignore = [
            opts.target + '/**/bower_components/**',
            opts.target + '/**/node_modules/**'
        ];

        var _run = function() {
            // Find bower.json files, as entry for themes.
            return glob(bowerFiles, {ignore: ignore})
            .then(_.partial(buildAll, _, opts))
            .catch(function(err) {
                util.err(chalk.red('Error:') + ' ' + (err.message || err.error));
            });
        };

        if (opts.watch) {
            var watchFiles = opts.target + '/**/*.less';
            gulp.watch(watchFiles, []).on('change', function(event) {
                console.log('File ' + event.path + ' was ' + event.type + ', running build...');
                _run();
            });
        }

        _run();
    }
});

function buildAll(files, opts) {
    var promises = [];
    files.forEach(function(f) {
        promises.push(fs.readJsonAsync(f).then(
            _.partial(buildTheme, _, opts)
        ));
    });
    return Q.all(promises);
}

function buildTheme(bowerJson, opts) {
    var entry = bowerJson.main;

    // Normalise main to an array.
    if (!_.isArray(entry)) {
        entry = [entry];
    }

    // Prefix with target.
    entry = entry.map(function(f) {
        return path.join(opts.target, f);
    });

    // Css files to rework are the less files, but with .css extension,
    // and are in the dist.
    var doReworkIe = function(entry) {
        if (opts['disable-ie']) {
            return entry;
        }
        return reworkIe(entry, opts.target);
    };

    // Compress files are the CSS and the ie.css files.
    var doCompress = function(entry) {
        if (opts['disable-compress']) {
            return entry;
        }
        return compress(entry, opts.target, opts);
    };

    // Copy Assets
    var doCopyAssets = function(entry) {
        if (opts['disable-assets']) {
            return entry;
        }
        return copyAssets(entry, opts);
    };

    // Import on completing.
    var doImport = function(entry) {
        if (opts.import) {
            return importCmd.runImport('./')
                .then(function() {
                    return entry;
                });
        } else {
            return entry;
        }
    };

    // Run.
    return compile(entry, opts)
        .then(doReworkIe)
        .then(doCompress)
        .then(doCopyAssets)
        .then(doImport);
}

function compile(entry, opts) {
    var deferred = Q.defer();
    var files = [];

    gulp.src(entry, {base: opts.target})
        .pipe(gulpif(function() { return !!opts.sourcemaps; }, sourcemaps.init()))
        .pipe(debug({title: 'compiling'}))
        .pipe(less({
            modifyVars: _.merge({}, { // use opts if defined.
                edition: opts.edition,
                'base-path': opts['base-path']
            })
        }))
        .on('error', deferred.reject)
        .pipe(rename(function(path) {
            path.dirname = distDirname(path.dirname, opts.dist);
            path.basename = 'base';
        }))
        .on('error', deferred.reject)
        .pipe(gulpif(function() { return !!opts.sourcemaps; }, sourcemaps.write('.')))

        // Save files for promise resolve.
        .pipe(through.obj(function (file, enc, cb) {
            if (file.path.substring(file.path.length - 4) !== '.map') {
                files.push(file.path);
            }
            cb(null, file);
        }))

        .pipe(debug({title: 'writing'}))
        .pipe(gulp.dest(opts.target))
        .on('end', function() {
            deferred.resolve(files);
        });

    return deferred.promise;
}

function distDirname(dirname, dist) {
    return dirname.replace('styles', path.join(dist, 'styles'));
}

function reworkIe(files, target) {
    // Helper function to rework CSS for IE8.
    function reworkIe8(ast) {
        // Push custom rule for IE8 to prevent responsiveness.
        ast.rules.push({
            type: 'rule',
            selectors: ['.container-fluid'],
            declarations: [
                {
                    type: 'declaration',
                    property: 'min-width',
                    value: '1024px'
                }
            ]
        });
    }

    // Create .ie.css for ie8 support (TODO: drop ie8 support).
    var deferred = Q.defer();

    gulp.src(files, {base: target})
        .pipe(debug({title: 'reworking'}))
        .pipe(rename({
            suffix: '.ie',
            extname: '.css'
        }))
        .pipe(mqRemove({width: '1024px'}))
        .pipe(rework(reworkIe8))
        .pipe(debug({title: 'writing'}))
        // Save files for promise resolve.
        .pipe(through.obj(function (file, enc, cb) {
            files.push(file.path);
            cb(null, file);
        }))
        .pipe(gulp.dest(target))
        .on('error', deferred.reject)
        .on('end', function() {
            deferred.resolve(files);
        });

    return deferred.promise;
}

function compress(entry, target, opts) {
    var deferred = Q.defer();

    gulp.src(entry, {base: target})
        .pipe(debug({title: 'compressing'}))
        .pipe(gulpif(function() { return !!opts.sourcemaps; }, sourcemaps.init({loadMaps: true})))
        .pipe(minifyCss({keepBreaks: true}))
        .pipe(rename({
            suffix: '.min',
            extname: '.css'
        }))
        .pipe(gulpif(function() { return true; }, sourcemaps.write('.')))
        .pipe(debug({title: 'writing'}))
        .pipe(gulp.dest(target))
        .on('error', deferred.reject)
        .on('end', deferred.resolve);

    return deferred.promise;
}

function copyAssets(entry, opts) {
    var deferred = Q.defer();

    var fontGlob = path.join('**', '*.{ttf,woff,woff2,eof,svg}');
    var imageGlob = path.join('**', '*.{jpg,jpeg,png,svg,gif}');
    var noDistGlob = path.join('!**', opts.dist, '**'); // don't copy from `dist` directories
    var noBowerGlob = path.join('!bower_components', '**'); // don't copy from `bower_components` directories

    gulp.task('copyThemeAssets', [], function () {
        var basePath = path.join('bower_components', 'theme');
        var universalAssets = gulp.src([
            path.join(basePath, 'universal', fontGlob),
            path.join(basePath, 'universal', imageGlob)
        ], {follow: true});
        var retailAssets = gulp.src([
            path.join(basePath, 'retail', fontGlob),
            path.join(basePath, 'retail', imageGlob)
        ], {follow: true});
        return merge(universalAssets, retailAssets)
            .pipe(debug({title: 'copying'}))
            .pipe(gulp.dest(opts.dist));
    });

    gulp.task('copyBowerAssets', ['copyThemeAssets'], function () {
        var assets = gulp.src([
            path.join('bower_components', fontGlob),
            path.join('bower_components', imageGlob),
            path.join('!bower_components', 'theme', '**')
        ], {follow: true});
        return assets
            .pipe(debug({title: 'copying'}))
            .pipe(rename(function (file) {
                // drop the module name from the path
                file.dirname = path.join.apply(null, file.dirname.split(path.sep).slice(1));
            }))
            .pipe(gulp.dest(opts.dist));
    });

    gulp.task('copyAssets', ['copyThemeAssets', 'copyBowerAssets'], function () {
        var assetPaths = [
            fontGlob,
            imageGlob,
            noBowerGlob,
            noDistGlob
        ];
        return gulp.src(assetPaths, {follow: true})
            .pipe(debug({title: 'copying'}))
            .pipe(gulp.dest(opts.dist));
    });

    gulp.start('copyAssets')
        .on('error', deferred.reject)
        .on('end', deferred.resolve);

    return deferred.promise;
}
