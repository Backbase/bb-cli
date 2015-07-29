// parsed model.xml string
// by removing unneeded attributes
// and optionally converting $(contextRoot0 to $(itemRoot)
var jxon = require('jxon');
var _ = require('lodash');
var formattor = require('formattor');


var propsToKeep = {
    name: true,
    contextItemName: true,
    extendedItemName: true,
    properties: true,
    tags: true
};

module.exports = function(xmlString) {
    var jx = jxon.stringToJs(xmlString);
    delete (jx.catalog.$totalSize);
    for (var k in jx.catalog.widget) {
        if (!propsToKeep[k]) {
            delete (jx.catalog.widget[k]);
        }
    }
    jx = '<?xml version="1.0" encoding="UTF-8"?>' + jxon.jsToString(jx);
    return formattor(jx, {method: 'xml'});
};
