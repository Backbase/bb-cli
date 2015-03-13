// Portal information gathering

var config = require('./config');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var path = require('path');
var Finder = require('fs-finder');
var readFile = Q.denodeify(fs.readFile);
var readDir = Q.denodeify(fs.readdir);
var acorn = require('acorn');
var escodegen = require('escodegen');
var estraverse = require('estraverse');

_.extend(exports, {
    // returns array of template paths that are used by master pages
    getMasterTemplatePaths: function(c) {
        return c.bbrest.page().query({f: 'itemHandlerBeanName(eq)pageDefinitionHandler'}).get()
        .then(function(r) {
            var jx = c.jxon.stringToJs(_.unescape(r.body)),
                pageTemplateNames = getProperties(jx.pages.page, 'TemplateName');
                promises = [];

            _.each(pageTemplateNames, function(tname) {
                promises.push(c.bbrest.template(tname).get());
            });

            return Q.all(promises)
            .then(function(ra) {
                var tmps = [];
                _.each(ra, function(resp) {
                    tmps.push(c.jxon.stringToJs(_.unescape(resp.body)).template);
                });
                tmps = getProperties(tmps);

                return exports.getPom(c)
                .then(function(pom) {
                    _.each(tmps, function(v, i) {
                        tmps[i] = path.join(
                                    c.config._local.path,
                                    '/target/',
                                    pom.project.artifactId,
                                    '/WEB-INF/',
                                    _.find(v, {$name: 'BundleName'}).value._,
                                    '/',
                                    _.find(v, {$name: 'Web'}).value._,
                                    '.jsp'
                                  );
                    });
                    // console.log(tmps);
                    return tmps;
                });
            });
        });
    },
    getPom: function(c, p) {
        p = p || '';
        var pomPath = path.join(c.config._local.path, p, '/pom.xml');
        return readFile(pomPath)
        .then(function(r) {
            return c.jxon.stringToJs(r.toString());
        });
    },
    getInfo: function(c, p) {
        return exports.getPom(c, p)
        .then(function(r) {
            var o = {};
            r = r.project;
            o.name = r.name;
            o.description = r.description;
            r = _.find(r.build.plugins.plugin, {artifactId: 'jetty-maven-plugin'});
            r = r.configuration;
            o.jetty = {
                context: r.webApp.contextPath,
                port: r.httpConnector.port,
                defaults: r.webApp.defaultsDescriptor,
                resources: r.webApp.resourceBases.resourceBase
            }
            return o;
        });
    },
    getStaticFiles: function(c, fileMask) {
        return exports.getPom(c)
        .then(function(pom) {
            var staticPath = path.join(
                                c.config._local.path,
                                '/target/',
                                pom.project.artifactId,
                                '/static/'
                             );
            return exports.getFiles(staticPath, fileMask);
        });
    },
    getFiles: function(dirPath, fileMask) {
        var dfrd = Q.defer();
        try {
            Finder.from(dirPath).findFiles(fileMask, function(files) {
                dfrd.resolve(files);
            });
        } catch(e) {
            dfrd.reject(new Error(e));
        }
        return dfrd.promise;
    },
    enableSymlinks: function(c) {
        var dirPath = path.join(c.config._local.path, '/configuration/');
        console.log(dirPath);
        return exports.getFiles(dirPath, 'webdefaults.xml')
        .then(function(files) {
            console.log(files);
        });
    },
    // returns object where keys are full paths to require-conf.js and values are js objects of paths and shim
    getRequireConfs: function(c) {
        return exports.getStaticFiles(c, 'require-conf.js')
        .then(function(files) {
            for (var a = [], i = 0; i < files.length; i++) a.push(readFile(files[i]));
            return Q.all(a)
            .then(function(fs) {
                var o = {};
                for (i = 0; i < fs.length; i++) o[files[i]] = parseRequireConf(fs[i].toString());
                return o;
            });
        });
    }
});

function parseRequireConf(s) {
    var ac = acorn.parse(s),
        est = _.where(ac.body, {type: 'ExpressionStatement'}),
        o = {string: s};
    // search for first config statement
    _.each(est, function(stm) {
        var cal = stm.expression.callee;
        if (s.substring(cal.start, cal.end) === 'requirejs.config') {
            _.each(stm.expression.arguments[0].properties, function(prop) {
                if (prop.key.name === 'paths' || prop.key.name === 'shim') {
                    o[prop.key.name] = getObjectFromAst(prop.value);
                    o[prop.key.name + 'Position'] = [prop.start, prop.end];
                    //var c = prop.end - 1;
                    // s = s.substring(0, c) + getInsertStrip('yo', 'statement') + s.substr(c);
                    // console.log(s.substring(prop.value.start, prop.value.end+100));
                }
            });
        }
    });
    return o;
}       
function getObjectFromAst(ast) {
    ast = estraverse.replace(ast, {
        enter: function(node) {
            if (node.type === 'Identifier') {
                if (node.name.substr(0, 1) !== '"') node.name = '"' + node.name + '"';
            }
            return node;
        }
    });
    return JSON.parse( escodegen.generate(ast, {
        format: {json: true}
    }) );
}

function getInsertStrip(id, c) {
    return "\n\/\/" + id + "\n, " + c + "\n\/\/ " + id + ' end';
}

function log(obj) {
    console.log(require('util').inspect(obj, true, 10));
}

function getProperties(col, propName) {
    var props = _.pluck(_.pluck(col, 'properties'), 'property'),
        a = [], name;
    if (!propName) return props;
    _.each(props, function(pps) {
        name = _.find(pps, {$name: propName}).value._;
        if (a.indexOf(name) === -1) a.push(name);
    });
    return a;
}


