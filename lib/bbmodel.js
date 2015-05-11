var xml2js = require('xml2js');
var parseString = xml2js.parseString;
var fs = require('fs');
var _ = require('lodash');
var request = require('request');
var path = require('path');
var util = require('../lib/util');
var url = require('url');
var chalk = require('chalk');
var config = require('./config');

exports.exportPortal = function (rawXml, portalName, destination, onFileCreated) {
    // TODO: refactor properties to object with ES6 destructuring pattern

    if (!_.isFunction(onFileCreated)) onFileCreated = function (){};

    var output = path.join(destination, portalName) + '.xml';

    fs.writeFile(
        output,
        rawXml,
        onFileCreated(output)
    );
};

exports.exportPortalStructured = function (xmlAst, portalName, destination, onFileCreated) {
    // TODO: refactor properties to object with ES6 destructuring pattern

    if (!_.isFunction(onFileCreated)) onFileCreated = function (){};

    var portalsBuilder = new xml2js.Builder({rootName: 'portals'});
    var catalogBuilder = new xml2js.Builder({rootName: 'catalog'});
    var rightsBuilder = new xml2js.Builder({rootName: 'rightsList'});
    var itemsBuilder = new xml2js.Builder({rootName: 'items'});
    var templatesBuilder = new xml2js.Builder({rootName: 'templates'});
    var linksBuilder = new xml2js.Builder({rootName: 'links'});

    // Portals
    var portalsData = portalsBuilder.buildObject({
        portal: parsePortal(xmlAst.exportBundle.portals.portal)
    });

    fs.writeFile(
        path.join(destination, portalName) + '-portal.xml',
        portalsData,
        onFileCreated(path.join(destination, portalName) + '-portal.xml')
    );


    // Master pages
    var masterPages = [];

    _.each(asArray(xmlAst.exportBundle.portalPages.page), function (page) {
        masterPages.push(parsePage(page));
    });

    var masterPagesData = catalogBuilder.buildObject({page: masterPages});

    fs.writeFile(
        path.join(destination, portalName) + '-master-pages.xml',
        masterPagesData,
        onFileCreated(path.join(destination, portalName) + '-master-pages.xml')
    );


    // Portal Containers
    var portalContainers = [];
    var masterContainers = [];

    _.each(asArray(xmlAst.exportBundle.portalContainers.container), function (container) {
        var parsedContainer = parseContainer(container);

        if (parsedContainer.hasOwnProperty("extendedItemName")) {
            if (parsedContainer.extendedItemName.split('')[0] === '[') {
                portalContainers.push(parsedContainer);
            } else {
                masterContainers.push(parsedContainer);
            }
        } else {
            //this should only be targeting container children
            portalContainers.push(parsedContainer);
        }
    });

    fs.writeFile(
        path.join(destination, portalName) + '-containers.xml',
        catalogBuilder.buildObject({container: portalContainers}),
        onFileCreated(path.join(destination, portalName) + '-containers.xml')
    );


    fs.writeFile(
        path.join(destination, portalName) + '-master-instance-containers.xml',
        catalogBuilder.buildObject({container: masterContainers}),
        onFileCreated(path.join(destination, portalName) + '-master-instance-containers.xml')
    );


    // Portal Widgets
    var portalWidgets = [];
    var masterWidgets = [];
    _.each(asArray(xmlAst.exportBundle.portalWidgets.widget), function (widget) {
        var parsedWidget = parseWidget(widget);
        if (parsedWidget.extendedItemName.split('')[0] === '[') {
            portalWidgets.push(parsedWidget);
        } else {
            masterWidgets.push(parsedWidget);
        }
    });

    fs.writeFile(
        path.join(destination, portalName) + '-widgets.xml',
        catalogBuilder.buildObject({widget: portalWidgets}),
        onFileCreated(path.join(destination, portalName) + '-widgets.xml')
    );

    fs.writeFile(
        path.join(destination, portalName) + '-master-instance-widgets.xml',
        catalogBuilder.buildObject({widget: masterWidgets}),
        onFileCreated(path.join(destination, portalName) + '-master-instance-widgets.xml')
    );


    // Portal pages
    var pages = [];
    _.each(asArray(xmlAst.exportBundle.pages.page), function (page) {
        pages.push(parsePage(page));
    });

    fs.writeFile(
        path.join(destination, portalName) + '-pages.xml',
        itemsBuilder.buildObject({pages: {page: pages}}),
        onFileCreated(path.join(destination, portalName) + '-pages.xml')
    );


    // Portal Containers Instance
    var portalContainersInstances = [];
    _.each(asArray(xmlAst.exportBundle.containers.container), function (container) {
        portalContainersInstances.push(parseContainer(container));
    });

    fs.writeFile(
        path.join(destination, portalName) + '-instance-containers.xml',
        catalogBuilder.buildObject({container: portalContainersInstances}),
        onFileCreated(path.join(destination, portalName) + '-instance-containers.xml')
    );


    // Portal Widgets Instance
    var portalWidgetsInstances = [];
    _.each(asArray(xmlAst.exportBundle.widgets.widget), function (widget) {
        portalWidgetsInstances.push(parseWidget(widget));
    });

    fs.writeFile(
        path.join(destination, portalName) + '-instance-widgets.xml',
        catalogBuilder.buildObject({widget: portalWidgetsInstances}),
        onFileCreated(path.join(destination, portalName) + '-instance-widgets.xml')
    );


    // Portal Rights
    var portalRights = [];
    var portalItselfRight;

    _.each(asArray(xmlAst.exportBundle.bundleRights.bundleRight), function (right) {
        var parsedRight = parseRights(right);
        if (parsedRight.contextItemName !== '[BBHOST]') {
            if (parsedRight.contextItemName === parsedRight.name) {
                portalItselfRight = parsedRight;
            } else {
                portalRights.push(parsedRight);
            }
        }
    });

    if (portalItselfRight) {
        portalRights.unshift(portalItselfRight);
        var portalGroups = _.pluck(portalItselfRight.itemRight, 'sid');

        _.each(portalRights, function (portalRight) {
            var groupsToAdd = _.xor(portalGroups, _.pluck(portalRight.itemRight, 'sid'));

            _.each(groupsToAdd, function (group) {
                portalRight.itemRight.push({
                    securityProfile: 'NONE',
                    sid: group
                });
            });
        });
    }

    fs.writeFile(
        path.join(destination, portalName) + '-rights.xml',
        rightsBuilder.buildObject({rights: portalRights}),
        onFileCreated(path.join(destination, portalName) + '-rights.xml')
    );


    // Portal Links
    var portalLinks = [];
    _.each(asArray(xmlAst.exportBundle.links.link), function (link) {
        portalLinks.push(parseLink(link));
    });

    fs.writeFile(
        path.join(destination, portalName) + '-links.xml',
        linksBuilder.buildObject({link: portalLinks}),
        onFileCreated(path.join(destination, portalName) + '-links.xml')
    );


    // Server Containers
    var serverContainers = [];
    _.each(asArray(xmlAst.exportBundle.serverContainers.container), function (container) {
        serverContainers.push(parseContainer(container));
    });
    fs.writeFile(
        path.join(destination, portalName) + '-server-containers.xml',
        catalogBuilder.buildObject({container: serverContainers}),
        onFileCreated(path.join(destination, portalName) + '-server-containers.xml')
    );


    // Server Widgets
    var serverWidgets = [];
    _.each(asArray(xmlAst.exportBundle.serverWidgets.widget), function (widget) {
        serverWidgets.push(parseWidget(widget));
    });

    fs.writeFile(
        path.join(destination, portalName) + '-server-widgets.xml',
        catalogBuilder.buildObject({widget: serverWidgets}),
        onFileCreated(path.join(destination, portalName) + '-server-widgets.xml')
    );


    // Templates
    var templates = [];
    _.each(asArray(xmlAst.exportBundle.templates.template), function (template) {
        templates.push(parseTemplate(template));
    });

    fs.writeFile(
        path.join(destination, portalName) + '-templates.xml',
        templatesBuilder.buildObject({template: templates}),
        onFileCreated(path.join(destination, portalName) + '-templates.xml')
    );

    return true;
};

exports.listPortals = function (cliOpts, callback) {
    if (!_.isFunction(callback)) callback = function (){};

    config.getCommon(cliOpts)
        .then(function(r) {
            var host = r.bbrest.config.host;
            var contextName = r.bbrest.config.context === '/' ? '' : r.bbrest.config.context;
            var port = r.bbrest.config.port;
            var user = r.bbrest.config.username;
            var pass = r.bbrest.config.password;

            var reqUrl = url.resolve('http://' + host + ':' + port, contextName + '/portals.xml');

            request({
                auth: {
                    user: user,
                    pass: pass
                },
                method: 'GET',
                url: reqUrl
            }, function (err, httpResponse, body) {
                if (err) return util.err('Error requesting url ' + reqUrl + err);

                var portals = [];
                var rawXml = body;

                parseString(rawXml, {explicitArray: false}, function (err, xmlAst) {
                    if (err || !xmlAst.portals) return util.err('Error requesting url ' + reqUrl + '. Server have not provided portals list.');

                    _.each(asArray(xmlAst.portals.portal), function (portal) {
                        if (portal.name !== 'dashboard') portals.push(portal.name);
                    });

                    callback(portals);
                });
            });
        })
        .fail(function(e) {
            console.log(chalk.red('bb prop error: '), e);
            console.log(e.stack);
        });
};

exports.getPortalModel = function (cliOpts, callback) {
    config.getCommon(cliOpts)
        .then(function(r) {
            var host = r.bbrest.config.host;
            var contextName = r.bbrest.config.context === '/' ? '' : r.bbrest.config.context;
            var port = r.bbrest.config.port;
            var user = r.bbrest.config.username;
            var pass = r.bbrest.config.password;
            var portal = r.bbrest.config.portal;

            var reqUrl = url.resolve('http://' + host + ':'+ port, contextName + '/export/portal?portalName=' + portal);

            request({
                auth: {
                    user: user,
                    pass: pass
                },
                method: 'GET',
                url: reqUrl
            }, function (err, httpResponse, body) {
                if (err) return util.err(err);

                var rawXml = body;

                parseString(rawXml, {explicitArray: false}, function (err, xmlAst) {

                    if (xmlAst && xmlAst.exportBundle) {
                        return callback(xmlAst, rawXml);
                    } else {
                        return callback();
                    }
                });
            });
        })
        .fail(function(e) {
            console.log(chalk.red('bb prop error: '), e);
            console.log(e.stack);
        });
};

var asArray = exports.asArray = function (obj) {
    return !_.isArray(obj) ? [obj] : obj;
};


var parsePortal = exports.parsePortal = function (portal) {
    var item = _.extend({}, portal);
    var toDelete = [
        'itemHandlerBeanName',
        'createdBy',
        'createdTimestamp',
        'lastModifiedBy',
        'lastModifiedTimestamp',
        'uuid',
        'lockState',
        'children',
        'hidden',
        // 'tags',
        'contents'
    ];

    return _.omit(item, toDelete);
};


var parsePage = exports.parsePage = function (page) {
    var item = _.extend({}, page);
    var toDelete = [
        'itemHandlerBeanName',
        'createdBy',
        'createdTimestamp',
        'lastModifiedBy',
        'lastModifiedTimestamp',
        'lockState',
        // 'uuid',
        'hidden'
    ];

    return _.omit(item, toDelete);
};


var parseLink = exports.parseLink = function (link) {
    var item = _.extend({}, link);
    var toDelete = [
        'itemHandlerBeanName',
        'createdBy',
        'createdTimestamp',
        'lastModifiedBy',
        'lastModifiedTimestamp',
        'hidden',
        'contents',
        // 'uuid',
        'lockState',
        'children'
    ];

    return _.omit(item, toDelete);
};


var parseTemplate = exports.parseTemplate = function (template) {
    var item = _.extend({}, template);
    var toDelete = [
        'itemHandlerBeanName',
        'createdBy',
        'createdTimestamp',
        'lastModifiedBy',
        'lastModifiedTimestamp',
        'hidden',
        'contents',
        'uuid',
        'lockState',
        'children'
    ];

    return _.omit(item, toDelete);
};


var parseContainer = exports.parseContainer = function (container) {
    var item = _.extend({}, container);
    var toDelete = [
        'itemHandlerBeanName',
        'createdBy',
        'createdTimestamp',
        'lastModifiedBy',
        'lastModifiedTimestamp',
        'hidden',
        'contents',
        'uuid',
        'lockState',
        'children'
    ];

    if (!item.properties || !item.properties.property) toDelete.push('properties');
    if (!item.tags || !item.tags.tag) toDelete.push('tags');

    return _.omit(item, toDelete);
};

var parseWidget = exports.parseWidget = function (widget) {
    var item = _.extend({}, widget);
    var toDelete = [
        'itemHandlerBeanName',
        'createdBy',
        'createdTimestamp',
        'lastModifiedBy',
        'lastModifiedTimestamp',
        'hidden',
        'contents',
        'uuid',
        'lockState',
        'children'
    ];

    if (!item.tags || !item.tags.tag) toDelete.push('tags');

    return _.omit(item, toDelete);
};

var parseRights = exports.parseRights = function (right) {
    var item = _.extend({}, right, {name: right.itemName, type: right.itemType});
    var toDelete = [
        // 'itemHandlerBeanName',
        'createdBy',
        'createdTimestamp',
        'lastModifiedBy',
        'lastModifiedTimestamp',
        'hidden',
        'contents',
        'uuid',
        'lockState',
        'children',
        'itemName',
        'itemType',
        'rights'
    ];

    item.itemRight = [];

    _.each(item.rights.itemRight, function (itemRight) {
        item.itemRight.push(_.omit(itemRight, '$'));
    });


    if (item.type === 'PORTAL') {
        item.contextItemName = item.name;
        item.type = 'portal';
    } else {
        item.type = {
            LINK: 'links',
            PAGE: 'pages',
            TEMPLATE: 'templates',
            CONTAINER: 'containers',
            WIDGET: 'widgets'
        }[item.type];
    }

    return _.omit(item, toDelete);
};

/** not being used, need refactoring **/
var parseRecursive = exports.parseRecursive = function (item) {
    var portals = [];
    var pages = [];
    var links = [];
    var containers = [];

    if (_.has(item, 'portal')) {
        _.each(asArray(item.portal), function (portal) {
            portals.push(parsePortal(portal));
            if (portal.children) _.each(asArray(portal.children), parseRecursive);
        });
    }

    if (_.has(item, 'link')) {
        _.each(asArray(item.link), function (link) {
            links.push(parseLink(link));
            if (link.children) _.each(asArray(link.children), parseRecursive);
        });
    }

    if (_.has(item, 'page')) {
        _.each(asArray(item.page), function (page) {
            pages.push(parsePage(page));
            if (page.children) _.each(asArray(page.children), parseRecursive);
        });
    }

    if (_.has(item, 'container')) {
        _.each(asArray(item.container), function (container) {
            containers.push(parseContainer(container));
            if (container.children) _.each(asArray(container.children), parseRecursive);
        });
    }

    if (_.has(item, 'widget')) {
        _.each(asArray(item.widget), parseWidget);
    }

    if (_.has(item, 'widgets')) {
        _.each(asArray(item.widgets), parseRecursive);
    }

};

exports.parseProperties = function (properties, itemName) {
    var props = [];

    _.each(properties.property, function (property) {
        if (property.$ && property.$.itemName === itemName) {
            props.push(_.extend({}, property, {$: _.omit(property.$, ['readonly', 'manageable'])}));
        }
    });
};
