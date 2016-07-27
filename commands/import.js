var chalk = require('chalk');
var util = require('../lib/util');
var config = require('../lib/config');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs-extra-promise');
var path = require('path');
var formattor = require('formattor');
var request = require('request-promise');
var url = require('url');
var querystring = require('querystring');

var JSZip = require('jszip');

var Command = require('ronin').Command;

var bbrest, jxon, cfg;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var d = chalk.gray;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' [OPTIONS]';
        r += '\n\t Imports portal.';
        r += '\n\n  ' + title('Options') + ': -short, --name <type> ' + d('default') + ' description\n';
        r += '      -t,  --target <string>\t\t' + '\t\tFile or dir to import.\n';
        r += '      -s,  --save <string>\t\t' + '\t\tName of the file to save. If defined, directory import zip will be saved instead of submitted.\n\n';

        r += '      -H,  --host <string>\t\t' + d('localhost') + '\tThe host name of the server running portal foundation.\n';
        r += '      -P,  --port <number>\t\t' + d('7777') + '\t\tThe port of the server running portal foundation.\n';
        r += '      -c,  --context <string>\t\t' + d('portalserver') + '\tThe application context of the portal foundation.\n';
        r += '      -u,  --username <string>\t\t' + d('admin') + '\t\tUsername.\n';
        r += '      -w,  --password <string>\t\t' + d('admin') + '\t\tPassword.\n';
        r += '      -p,  --portal <string>\t\t\t\tName of the portal on the server to target.\n';
        r += '           --portal-version <string>\t' +d('5.6.1') +'\t\tVersion of the portal(eg 5.6.1).\n';
        r += '\n  ' + title('Examples') + ':\n\n';
        r += '      bb import --target myPortal.xml\t\t\tImports portal from myPortal.xml\n';
        r += '      bb import --target chunked\t\t\tImports bb export chunked portal from chunked dir\n';
        return r;
    },

    options: util.buildOpts({
        target: {type: 'string', alias: 't'},
        dashboard: {type: 'boolean', alias: 'd'},
        save: {type: 'string', alias: 's'},
        portal: {type: 'string', alias: 'p'}
    }),

    run: function () {

        util.spin.message('Loading...');
        util.spin.start();
        return config.getCommon(this.options)
        .then(function(r) {
            bbrest = r.bbrest;
            jxon = r.jxon;
            cfg = r.config.cli;

            if (cfg.dashboard) return importDashboard();

            if (!cfg.target) return error(new Error('Target is not defined.'));

            return fs.lstatAsync(cfg.target)
            .then(function(stats) {
                if (stats.isDirectory()) {
                    return importDir();
                } else if (stats.isFile()) {
                    var pth = path.parse(cfg.target);
                    if (pth.ext === '.xml') return bbrest.import().post(cfg.target);
                    else if (pth.ext === '.zip') return bbrest.import().file(cfg.target).post();
                    throw new Error('File must be xml or zip archive');
                }
                throw new Error('Target is not directory or file.');
            })
            .then(function(bbr) {
                if (bbr.error) {
                    var emsg = jxon.stringToJs(bbr.body);
                    emsg = emsg.errorMessage || emsg.importErrorMessage || {message: 'Unknown import message.'};
                    throw new Error(emsg.message);
                } else ok(bbr);
            })
            .catch(function(err) {
              console.log(err);
                if (err.code === 'ENOENT') return error(new Error('Target does not exist.'));
                return error(new Error(err.statusInfo || err));
            });


        });

    }

});

function error(err) {
    util.spin.stop();
    util.err(chalk.red('bb import: ') + (err.message || err.error));
}
function ok(r) {
    util.spin.stop();
    util.ok('Importing ' + chalk.green(cfg.target) + '. Done.');
    return r;
}

function importDir() {
    return fs.readFileAsync(path.resolve(cfg.target, 'metadata.xml'))
    .then(function(r) {
        var mj = jxon.stringToJs(r.toString());
        return fs.readdirAsync(cfg.target)
        .then(function(d) {
            var xmls = {};
            var all = [];
            var noneXmlFiles = [];
            _.each(d, function(v) {
                var pth = path.parse(v);
                if (pth.ext === '.xml') {
                    if (pth.name !== 'metadata') {
                        all.push(fs.readFileAsync(path.resolve(cfg.target, v)).then(function(s) {
                            xmls[_.camelCase(pth.name)] = s.toString();
                        }));
                    }
                } else {
                    noneXmlFiles.push(path.resolve(cfg.target, v));
                }
            });
            return Q.all(all)
            .then(function() {
                var finalXml = '<exportBundle>';
                var order = mj.backbaseArchiveDescriptor.bbexport.order.split(',');
                _.each(order, function(f) {
                    if (xmls[f]) finalXml += xmls[f];
                    else finalXml += ('<' + f + '/>');
                });
                finalXml += '</exportBundle>';

                delete mj.backbaseArchiveDescriptor.bbexport;

                if (noneXmlFiles.length) {
                    return packAll(mj, finalXml, noneXmlFiles)
                    .then(function(zip) {
                        var pth = path.resolve(path.parse(cfg.target).dir, '_$import-temp$_.zip');
                        return fs.writeFileAsync(pth, zip)
                        .then(function() {
                            if (cfg.save) {
                                return fs.moveAsync(pth, path.resolve(cfg.save), {clobber: true})
                                .then(function() {
                                    return {error: false};
                                });
                            }
                            return bbrest.import().file(pth).post();
                        })
                        .finally(function() {
                            if (!cfg.save) fs.removeAsync(pth);
                        });
                    });
                } else {
                    return bbrest.import().post({_string: finalXml});
                }
            });
        });
    });
}

function packAll(metadata, xml, other) {
    metadata.backbaseArchiveDescriptor.packageId = 'content';

    var zip = new JSZip();
    var all = [];

    xml = formattor(xml, {method: 'xmlmin'});

    zip.file('metadata.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + jxon.jsToString(metadata));
    zip.file('content/portalserver.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + xml);
    _.each(other, function(v) {
        all.push(fs.readFileAsync(v).then(function(fdata) {
            var pth = path.parse(v);
            zip.file('content/' + pth.base, fdata);
        }));
    });

    return Q.all(all)
    .then(function() {
        return zip.generate({type: 'nodebuffer', compression: 'DEFLATE'});
    });
}

function getSession(opts) {
  return request(opts)
    .then(function(res) {
        var sessionHeaders = {
          Cookie: res.headers['set-cookie']
        }
        const csrf = res.headers['x-bbxsrf'];
        if (csrf) sessionHeaders['X-BBXSRF'] = csrf;
        return sessionHeaders;
    });
}

// dirty dashboard import
function importDashboard() {
    var body = 'portals%5Bdashboard%5D.importIt=true&_portals%5Bdashboard%5D.importIt=on&portals%5Bdashboard%5D.deleteIt=true&_portals%5Bdashboard%5D.deleteIt=on&importGroupsFlag=true&_importGroupsFlag=on&importUsersFlag=true&_importUsersFlag=on&serverItems%5Bbackbase.com.2012.darts%2Ftemplate-containers.xml%5D%5BTCont%5D=true&_serverItems%5Bbackbase.com.2012.darts%2Ftemplate-containers.xml%5D%5BTCont%5D=on&serverItems%5Bbackbase.com.2013.aurora%2Ftemplate-pages.xml%5D%5BBlankPageTemplate%5D=true&_serverItems%5Bbackbase.com.2013.aurora%2Ftemplate-pages.xml%5D%5BBlankPageTemplate%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-containers.xml%5D%5BRootContainer%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-containers.xml%5D%5BRootContainer%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-containers.xml%5D%5BRowWithSlide_container%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-containers.xml%5D%5BRowWithSlide_container%5D=on&serverItems%5Bbackbase.com.2013.aurora%2Ftemplate-containers.xml%5D%5BManageableArea%5D=true&_serverItems%5Bbackbase.com.2013.aurora%2Ftemplate-containers.xml%5D%5BManageableArea%5D=on&serverItems%5Bbackbase.com.2012.darts%2Fcatalog-containers.xml%5D%5BTargetingContainerChild%5D=true&_serverItems%5Bbackbase.com.2012.darts%2Fcatalog-containers.xml%5D%5BTargetingContainerChild%5D=on&serverItems%5Bbackbase.com.2012.darts%2Fcatalog-containers.xml%5D%5BTargetingContainer%5D=true&_serverItems%5Bbackbase.com.2012.darts%2Fcatalog-containers.xml%5D%5BTargetingContainer%5D=on&serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-widgets.xml%5D%5BW3C_Widget%5D=true&_serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-widgets.xml%5D%5BW3C_Widget%5D=on&serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-widgets.xml%5D%5BStandard_Widget%5D=true&_serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-widgets.xml%5D%5BStandard_Widget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-pages.xml%5D%5BBB_Dashboard_Migration%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-pages.xml%5D%5BBB_Dashboard_Migration%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-pages.xml%5D%5BBB_Dashboard%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-pages.xml%5D%5BBB_Dashboard%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-pages.xml%5D%5Bcxp-manager-page%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-pages.xml%5D%5Bcxp-manager-page%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-pages.xml%5D%5BRootPage%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-pages.xml%5D%5BRootPage%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BSideNav_widget%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BSideNav_widget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BPortalNavigation_widget%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BPortalNavigation_widget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BRootWidget%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BRootWidget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BAppTitle_widget%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BAppTitle_widget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BStaticLeftFlexRight%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BStaticLeftFlexRight%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BSimpleTabBox%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BSimpleTabBox%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BResizeableTwoColumn%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BResizeableTwoColumn%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BRowWithSlide%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BRowWithSlide%5D=on&serverItems%5Bbackbase.com.2013.aurora%2Fcatalog-containers-adminDesignerOnly.xml%5D%5BManageable_Area_Closure%5D=true&_serverItems%5Bbackbase.com.2013.aurora%2Fcatalog-containers-adminDesignerOnly.xml%5D%5BManageable_Area_Closure%5D=on&serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-containers.xml%5D%5BColumn_table%5D=true&_serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-containers.xml%5D%5BColumn_table%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fcontent-repository.xml%5D%5BcontentRepository%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fcontent-repository.xml%5D%5BcontentRepository%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bwidget-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bwidget-default%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bportal-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bportal-default%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Blink-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Blink-default%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bpage-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bpage-default%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bcontainer-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bcontainer-default%5D=on';
    var body2 = 'portals%5Bdashboard%5D.importIt=true&_portals%5Bdashboard%5D.importIt=on&_portals%5Bdashboard%5D.deleteIt=on&importGroupsFlag=true&_importGroupsFlag=on&importUsersFlag=true&_importUsersFlag=on&serverItems%5Bbackbase.com.2012.darts%2Ftemplate-containers.xml%5D%5BTCont%5D=true&_serverItems%5Bbackbase.com.2012.darts%2Ftemplate-containers.xml%5D%5BTCont%5D=on&serverItems%5Bbackbase.com.2013.aurora%2Ftemplate-pages.xml%5D%5BBlankPageTemplate%5D=true&_serverItems%5Bbackbase.com.2013.aurora%2Ftemplate-pages.xml%5D%5BBlankPageTemplate%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-containers.xml%5D%5BRootContainer%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-containers.xml%5D%5BRootContainer%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-containers.xml%5D%5BRowWithSlide_container%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-containers.xml%5D%5BRowWithSlide_container%5D=on&serverItems%5Bbackbase.com.2013.aurora%2Ftemplate-containers.xml%5D%5BManageableArea%5D=true&_serverItems%5Bbackbase.com.2013.aurora%2Ftemplate-containers.xml%5D%5BManageableArea%5D=on&serverItems%5Bbackbase.com.2012.darts%2Fcatalog-containers.xml%5D%5BTargetingContainerChild%5D=true&_serverItems%5Bbackbase.com.2012.darts%2Fcatalog-containers.xml%5D%5BTargetingContainerChild%5D=on&serverItems%5Bbackbase.com.2012.darts%2Fcatalog-containers.xml%5D%5BTargetingContainer%5D=true&_serverItems%5Bbackbase.com.2012.darts%2Fcatalog-containers.xml%5D%5BTargetingContainer%5D=on&serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-widgets.xml%5D%5BW3C_Widget%5D=true&_serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-widgets.xml%5D%5BW3C_Widget%5D=on&serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-widgets.xml%5D%5BStandard_Widget%5D=true&_serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-widgets.xml%5D%5BStandard_Widget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-pages.xml%5D%5BBB_Dashboard_Migration%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-pages.xml%5D%5BBB_Dashboard_Migration%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-pages.xml%5D%5BBB_Dashboard%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-pages.xml%5D%5BBB_Dashboard%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-pages.xml%5D%5Bcxp-manager-page%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-pages.xml%5D%5Bcxp-manager-page%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-pages.xml%5D%5BRootPage%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-pages.xml%5D%5BRootPage%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BAjaxButton_widget%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BAjaxButton_widget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BSideNav_widget%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BSideNav_widget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BPortalNavigation_widget%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BPortalNavigation_widget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BRootWidget%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BRootWidget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BAppTitle_widget%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fenterprise-catalog-widgets.xml%5D%5BAppTitle_widget%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BStaticLeftFlexRight%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BStaticLeftFlexRight%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BSimpleTabBox%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BSimpleTabBox%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BResizeableTwoColumn%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BResizeableTwoColumn%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BRowWithSlide%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BRowWithSlide%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BResponsiveGrid%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Ftemplate-containers.xml%5D%5BResponsiveGrid%5D=on&serverItems%5Bbackbase.com.2013.aurora%2Fcatalog-containers-adminDesignerOnly.xml%5D%5BManageable_Area_Closure%5D=true&_serverItems%5Bbackbase.com.2013.aurora%2Fcatalog-containers-adminDesignerOnly.xml%5D%5BManageable_Area_Closure%5D=on&serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-containers.xml%5D%5BColumn_table%5D=true&_serverItems%5Bbackbase.com.2012.aurora%2Ftemplate-containers.xml%5D%5BColumn_table%5D=on&serverItems%5Bbackbase.com.2014.zenith%2Fcontent-repository.xml%5D%5BcontentRepository%5D=true&_serverItems%5Bbackbase.com.2014.zenith%2Fcontent-repository.xml%5D%5BcontentRepository%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bwidget-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bwidget-default%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bportal-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bportal-default%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Blink-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Blink-default%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bpage-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bpage-default%5D=on&serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bcontainer-default%5D=true&_serverItems%5B..%2FdefaultImportData%2Ftemplates.xml%5D%5Bcontainer-default%5D=on';

    var bbrc = bbrest.config;
    var uri = bbrc.scheme + '://' + bbrc.host + ':' + bbrc.port + '/' + bbrc.context;
    var options = {
        uri: uri + '/import',
        method: 'POST',
        headers: {
            Pragma: 'no-cache',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Accept: '*/*',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        },
        body: (cfg['portal-version'] && cfg['portal-version'] === '5.6.2')? body2 : body
    };
    return getSession({
        method: 'GET',
        uri: uri + '/groups',
        auth: {
            username: bbrc.username,
            password: bbrc.password
        },
        resolveWithFullResponse: true
      })
      .then(function(sessionHeaders) {
        Object.assign(options.headers, sessionHeaders);
        return request(options)
          .then(dashok);
      })
      .catch(function(err) {
          var qs = url.parse(err.response.headers.location).query;
          var msg = querystring.parse(qs).errorMessage;
          if (msg) {
            error({message: msg});
          } else {
            dashok();
          }
      });
}

function dashok() {
    util.spin.stop();
    util.ok('Importing ' + chalk.green('dashboard') + '. Done.');
}
