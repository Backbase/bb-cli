var xml2js = require('xml2js');
var parseString = xml2js.parseString;
var fs = require('fs');
var _ = require('lodash');
var request = require('request');
var path = require('path')
var util = require('../lib/util')
var url = require('url')

var exportPortal = exports.exportPortal = function(xml, portal_name, destination, onFileCreated){
	if(!_.isFunction(onFileCreated)) onFileCreated = function(){}


	// Portals
	var portalsBuilder = new xml2js.Builder({rootName: 'portals'});
	// console.log(portalsBuilder.buildObject({portal: parsePortal(xml.exportBundle.portals.portal)}))
	fs.writeFileSync(path.join(destination, portal_name) + '-portal.xml', portalsBuilder.buildObject({portal: parsePortal(xml.exportBundle.portals.portal)}));
	onFileCreated(path.join(destination, portal_name) + '-portal.xml')

	// Master pages
	var masterPages = []
	var catalogBuilder = new xml2js.Builder({rootName: 'catalog'});
	_.each(asArray(xml.exportBundle.portalPages.page), function(page){
		masterPages.push(parsePage(page))
	})
	// console.log(catalogBuilder.buildObject({page: masterPages}))
	fs.writeFileSync(path.join(destination, portal_name) + '-master-pages.xml', catalogBuilder.buildObject({page: masterPages}));
	onFileCreated(path.join(destination, portal_name) + '-master-pages.xml')

	// Portal Containers
	var portalContainers = []
	var masterContainers = []
	var catalogBuilder = new xml2js.Builder({rootName: 'catalog'});
	_.each(asArray(xml.exportBundle.portalContainers.container), function(container){
		var parsedContainer = parseContainer(container);

		if(parsedContainer.extendedItemName.split('')[0] == '[') {
			// portalContainers.push(_.pick(parsedContainer, ['name', 'contextItemName', 'extendedItemName']))
			portalContainers.push(parsedContainer)
		} else {
			// console.log('# the container below should not be a container instance')
			// console.log(parsedContainer)
			// portalContainers.push(_.pick(parsedContainer, ['name', 'contextItemName', 'extendedItemName']))
			masterContainers.push(parsedContainer)
		}
	})
	// console.log(catalogBuilder.buildObject({container: portalContainers}))
	fs.writeFileSync(path.join(destination, portal_name) + '-containers.xml', catalogBuilder.buildObject({container: portalContainers}));
	onFileCreated(path.join(destination, portal_name) + '-containers.xml')
	fs.writeFileSync(path.join(destination, portal_name) + '-master-instance-containers.xml', catalogBuilder.buildObject({container: masterContainers}));
	onFileCreated(path.join(destination, portal_name) + '-master-instance-containers.xml')

	// Portal Widgets
	var catalogBuilder = new xml2js.Builder({rootName: 'catalog'});
	var portalWidgets = [];
	var masterWidgets = [];
	_.each(asArray(xml.exportBundle.portalWidgets.widget), function(widget){
		var parsedWidget = parseWidget(widget);
		if(parsedWidget.extendedItemName.split('')[0] == '[') {
			// portalWidgets.push(_.pick(parsedWidget, ['name', 'contextItemName', 'extendedItemName']))
			portalWidgets.push(parsedWidget)
		} else {
			// console.log('# the widget below should not be a widget instance')
			// console.log(parsedWidget)
			// portalWidgets.push(_.pick(parsedWidget, ['name', 'contextItemName', 'extendedItemName']))
			masterWidgets.push(parsedWidget)
		}
	})
	// console.log(catalogBuilder.buildObject({widget: portalWidgets}))
	fs.writeFileSync(path.join(destination, portal_name) + '-widgets.xml', catalogBuilder.buildObject({widget: portalWidgets}));
	onFileCreated(path.join(destination, portal_name) + '-widgets.xml')
	fs.writeFileSync(path.join(destination, portal_name) + '-master-instance-widgets.xml', catalogBuilder.buildObject({widget: masterWidgets}));
	onFileCreated(path.join(destination, portal_name) + '-master-instance-widgets.xml')

	// Portal pages
	var pages = []
	var catalogBuilder = new xml2js.Builder({rootName: 'items'});
	_.each(asArray(xml.exportBundle.pages.page), function(page){
		pages.push(parsePage(page))
	})
	// console.log(catalogBuilder.buildObject({page: pages}))
	fs.writeFileSync(path.join(destination, portal_name) + '-pages.xml', catalogBuilder.buildObject({pages: {page: pages}}));
	onFileCreated(path.join(destination, portal_name) + '-pages.xml')


	// Portal Containers Instance
	var portalContainersInstances = []
	var catalogBuilder = new xml2js.Builder({rootName: 'catalog'});
	_.each(asArray(xml.exportBundle.containers.container), function(container){
		portalContainersInstances.push(parseContainer(container))
	})
	// console.log(catalogBuilder.buildObject({container: portalContainersInstances}))
	fs.writeFileSync(path.join(destination, portal_name) + '-instance-containers.xml', catalogBuilder.buildObject({container: portalContainersInstances}));
	onFileCreated(path.join(destination, portal_name) + '-instance-containers.xml')


	// Portal Widgets Instance
	var portalWidgetsInstances = []
	var catalogBuilder = new xml2js.Builder({rootName: 'catalog'});
	_.each(asArray(xml.exportBundle.widgets.widget), function(widget){
		portalWidgetsInstances.push(parseWidget(widget))
	})
	// console.log(catalogBuilder.buildObject({widget: portalWidgetsInstances}))
	fs.writeFileSync(path.join(destination, portal_name) + '-instance-widgets.xml', catalogBuilder.buildObject({widget: portalWidgetsInstances}));
	onFileCreated(path.join(destination, portal_name) + '-instance-widgets.xml')


	// Portal Rights
	var portalRights = [];
	var portalItselfRight;
	var catalogBuilder = new xml2js.Builder({rootName: 'rightsList'});
	_.each(asArray(xml.exportBundle.bundleRights.bundleRight), function(right){
		var parsedRight = parseRights(right);
		if(parsedRight.contextItemName != '[BBHOST]') {
			if(parsedRight.contextItemName === parsedRight.name) {
				portalItselfRight = parsedRight;
			} else {
				portalRights.push(parsedRight)
			}
		}
	})

	if(portalItselfRight){
		portalRights.unshift(portalItselfRight)
		var portalGroups = _.pluck(portalItselfRight.itemRight, 'sid');

		_.each(portalRights, function(portalRight){
			var groupsToAdd = _.xor(portalGroups, _.pluck(portalRight.itemRight, 'sid'));

			_.each(groupsToAdd, function(group){
				portalRight.itemRight.push({
					securityProfile: 'NONE',
					sid: group
				})
			})
		})
	}

	// console.log(catalogBuilder.buildObject({rights: portalRights}))
	fs.writeFileSync(path.join(destination, portal_name) + '-rights.xml', catalogBuilder.buildObject({rights: portalRights}));
	onFileCreated(path.join(destination, portal_name) + '-rights.xml')


	// Portal Links
	var portalLinks = []
	var catalogBuilder = new xml2js.Builder({rootName: 'links'});
	_.each(asArray(xml.exportBundle.links.link), function(link){
		portalLinks.push(parseLink(link))
	})
	// console.log(catalogBuilder.buildObject({link: portalLinks}))
	fs.writeFileSync(path.join(destination, portal_name) + '-links.xml', catalogBuilder.buildObject({link: portalLinks}));
	onFileCreated(path.join(destination, portal_name) + '-links.xml')


	// Server Containers
	var serverContainers = []
	var catalogBuilder = new xml2js.Builder({rootName: 'catalog'});
	_.each(asArray(xml.exportBundle.serverContainers.container), function(container){
		serverContainers.push(parseContainer(container))
	})
	// console.log(catalogBuilder.buildObject({container: serverContainers}))
	fs.writeFileSync(path.join(destination, portal_name) + '-server-containers.xml', catalogBuilder.buildObject({container: serverContainers}));
	onFileCreated(path.join(destination, portal_name) + '-server-containers.xml')


	// Server Widgets
	var catalogBuilder = new xml2js.Builder({rootName: 'catalog'});
	var serverWidgets = [];
	_.each(asArray(xml.exportBundle.serverWidgets.widget), function(widget){
		serverWidgets.push(parseWidget(widget))
	})
	// console.log(catalogBuilder.buildObject({widget: serverWidgets}))
	fs.writeFileSync(path.join(destination, portal_name) + '-server-widgets.xml', catalogBuilder.buildObject({widget: serverWidgets}));
	onFileCreated(path.join(destination, portal_name) + '-server-widgets.xml')


	// Templates
	var templatesBuilder = new xml2js.Builder({rootName: 'templates'});
	var templates = [];
	_.each(asArray(xml.exportBundle.templates.template), function(template){
		templates.push(parseTemplate(template))
	})
	// console.log(templatesBuilder.buildObject({template: templates}))
	fs.writeFileSync(path.join(destination, portal_name) + '-templates.xml', templatesBuilder.buildObject({template: templates}));
	onFileCreated(path.join(destination, portal_name) + '-templates.xml')

	return true;
}

var listPortals = exports.listPortals = function(callback){
	var req = request({
		'auth': {
			'user': program.authentication.split(':')[0],
			'pass': program.authentication.split(':')[1]
		},
		method: 'GET',
		url: url.resolve(program.portal_url, '/portalserver/portals.xml')
	}, function(err, httpResponse, body){

		if(err) return util.err(err)

		var portals = [];

		parseString(body, {explicitArray: false}, function (err, xml) {

			_.each(asArray(xml.portals.portal), function(portal){
				if(portal.name != 'dashboard') portals.push(portal.name)
			})

			callback(portals)

		});
	})
}

var getPortalModel = exports.getPortalModel = function(portal_name, callback){
	request({
		'auth': {
			'user': program.authentication.split(':')[0],
			'pass': program.authentication.split(':')[1]
		},
		method: 'GET',
		url: url.resolve(program.portal_url, '/portalserver/export/portal?portalName=' + portal_name),
	}, function(err, httpResponse, body){

		if(err) return util.err(err)

		parseString(body, {explicitArray: false}, function (err, xml) {

			if(xml && xml.exportBundle) {
				return callback(xml);
			} else {
				return callback(false);
			}

		});
	})
}

var asArray = exports.asArray = function(obj){
	return !_.isArray(obj) ? [obj] : obj;
}


var parsePortal = exports.parsePortal = function(portal){
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
		'contents',
		// 'tags'
	]

	return _.omit(item, toDelete);
}


var parsePage = exports.parsePage = function(page){
	var item = _.extend({}, page);
	var toDelete = [
		'itemHandlerBeanName',
		'createdBy',
		'createdTimestamp',
		'lastModifiedBy',
		'lastModifiedTimestamp',
		'lockState',
		'hidden',
		// 'uuid',

	]

	return _.omit(item, toDelete);
}



var parseLink = exports.parseLink = function(link){
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
		'children',
	]

	return _.omit(item, toDelete);
}


var parseTemplate = exports.parseTemplate = function(template){
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
		'children',
	]

	return _.omit(item, toDelete);
}


var parseContainer = exports.parseContainer = function(container){
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
		'children',
	]

	if(!item.properties || !item.properties.property) toDelete.push('properties');
	if(!item.tags || !item.tags.tag) toDelete.push('tags');

	return _.omit(item, toDelete);
}

var parseWidget = exports.parseWidget = function(widget){
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
		'children',
	]

	if(!item.tags || !item.tags.tag) toDelete.push('tags');

	return _.omit(item, toDelete);
}

var parseRights = exports.parseRights = function(right){
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
	]

	item.itemRight = [];

	_.each(item.rights.itemRight, function(itemRight) {
		item.itemRight.push(_.omit(itemRight, '$'))
	})


	if(item.type == 'PORTAL') {
		item.contextItemName = item.name;
		item.type = 'portal';
	} else {
		item.type = {
			LINK: 'links',
			PAGE: 'pages',
			TEMPLATE: 'templates',
			CONTAINER: 'containers',
			WIDGET: 'widgets'
		}[item.type]
	}

	return _.omit(item, toDelete);
}

/** not being used, beed refactoring **/
var parseRecursive = exports.parseRecursive = function(item){
	// var portals = [];
	// var pages = [];
	// var links = [];
	// var containers = [];
	// var widgets = [];

	if(_.has(item, 'portal')) {
		_.each(asArray(item.portal), function(portal){
			portals.push(parsePortal(portal));
			if(portal.children) _.each(asArray(portal.children), parseRecursive)
		})
	}

	if(_.has(item, 'link')) {
		_.each(asArray(item.link), function(link){
			links.push(parseLink(link))
			if(link.children) _.each(asArray(link.children), parseRecursive)
		})
	}

	if(_.has(item, 'page')) {
		_.each(asArray(item.page), function(page){
			pages.push(parsePage(page));
			if(page.children) _.each(asArray(page.children), parseRecursive)
		})
	}

	if(_.has(item, 'container')) {
		_.each(asArray(item.container), function(container){
			containers.push(parseContainer(container))
			if(container.children) _.each(asArray(container.children), parseRecursive)
		})
	}

	if(_.has(item, 'widget')) {
		_.each(asArray(item.widget), parseWidget)
	}

	if(_.has(item, 'widgets')) {
		_.each(asArray(item.widgets), parseRecursive)
	}

}

/** not being used **/
var parseProperties = exports.parseProperties = function(properties, itemName){
	var props = [];

	_.each(properties.property, function(property){
		if(property.$ && property.$.itemName == itemName) {
			props.push(_.extend({}, property, {$: _.omit(property.$, ['readonly', 'manageable'])}))
		}
	})
}
