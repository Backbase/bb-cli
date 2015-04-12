// Portal information gathering

var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var path = require('path');
var Finder = require('fs-finder');
var readFile = Q.denodeify(fs.readFile);

_.extend(exports, {
    // returns array of template paths that are used by master pages
    getMasterTemplatePaths: function(c) {
        return c.bbrest.page().query({f: 'itemHandlerBeanName(eq)pageDefinitionHandler'}).get()
        .then(function(r) {
            var jx = c.jxon.stringToJs(_.unescape(r.body));
            var pageTemplateNames = getProperties(jx.pages.page, 'TemplateName');
            var promises = [];

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
            };
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
    }
});

function getProperties(col, propName) {
    var props = _.pluck(_.pluck(col, 'properties'), 'property');
    var a = [];
    var name;
    if (!propName) return props;
    _.each(props, function(pps) {
        name = _.find(pps, {$name: propName}).value._;
        if (a.indexOf(name) === -1) a.push(name);
    });
    return a;
}
