// parsed model.xml string
// by removing unneeded attributes
// and optionally converting $(contextRoot0 to $(itemRoot)
var jxon = require('jxon');
var _ = require('lodash');
var formattor = require('formattor');

var tagsToKeep = {
    name: true,
    contextItemName: true,
    properties: true,
    tags: true
};

var propsToDelete = {
    noForceChrome: true,
    messageSrc: true
};

module.exports = function(xmlString, edge, widgetTry) {
    var jx = jxon.stringToJs(xmlString);
    delete (jx.catalog.$totalSize);
    _.each(jx.catalog, function(type) {
        _.each(type, function(tagValue, tagName) {
            if (tagsToKeep[tagName]) {
                if (!edge) return;
                if (tagName === 'name' && widgetTry) {
                    type[tagName] = 'widget-' + tagValue;
                }
                if (tagValue === '') delete type[tagName];
                else {
                    if (tagName === 'properties') {
                        _.remove(tagValue.property, function(n) {
                            return propsToDelete[n.$name];
                        });
                        _.each(tagValue.property, function(prop) {
                            delete prop.$readonly;
                            delete prop.$manageable;
                            delete prop.$itemName;
                            if (typeof prop.value._ === 'string') {
                                prop.value._ = prop.value._.replace(/\$\(contextRoot\).*\/widgets\/[^\/]+\//gi, '$(itemRoot)/');
                            }
                            if (prop.$name === 'widgetChrome') {
                                prop.value._ = '$(itemRoot)/static/features/[BBHOST]/chromes/blank/chrome-blank.html';
                            }
                        });
                        tagValue.property = _.sortBy(tagValue.property, '$name');
                    }
                }
            } else {
                delete type[tagName];
            }
        });
    });
    jx = '<?xml version="1.0" encoding="UTF-8"?>' + jxon.jsToString(jx);
    return formattor(jx, {method: 'xml'});
};
