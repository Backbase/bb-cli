var fs = require('fs-extra-promise');
var _ = require('lodash');
var formattor = require('formattor');

module.exports = function(jxon) {
    return new ModelXml(jxon);
};

function ModelXml(jxon) {
    this.jxon = jxon;
}

_.assign(ModelXml.prototype, {
    // if it fails to read and name is defined
    // it will auto create feature with that name
    read: function(filePath) {
        var that = this;
        return fs.readFileAsync(filePath)
        .then(function(str) {
            that.jsModel = that.jxon.stringToJs(str.toString());
            return that.jsModel;
        });
    },
    createFeature: function(name) {
        this.jsModel = {
            catalog: {
                feature: {
                    name: name,
                    contextItemName: '[BBHOST]',
                    properties: {
                        property: [
                        {
                            $name: 'title',
                            $label: 'Title',
                            $viewHint: 'admin,designModeOnly',
                            value: {
                                $type: 'string',
                                _: _.startCase(name)
                            }
                        }]
                    }
                }
            }
        };
    },
    isEmpty: function() {
        return (this.jsModel === undefined);
    },
    getXml: function() {
        var model = '<?xml version="1.0" encoding="UTF-8"?>' + this.jxon.jsToString(this.jsModel);
        return formattor(model, {method: 'xml'});
    },
    getBody: function() {
        var key = _.keys(this.jsModel.catalog)[0];
        return this.jsModel.catalog[key];
    },
    getName: function() {
        return this.getBody().name;
    },
    getProperty: function(name) {
        var props = this.getBody().properties;
        if (!(props.property instanceof Array)) props.property = [props.property];
        var p = _.where(props.property, {$name: name})[0];
        if (p && p.value) return p.value._;
        return undefined;
    },
    addProperty: function(name, value) {
        var props = this.getBody().properties;
        if (!(props.property instanceof Array)) props.property = [props.property];

        props.property.push({
            $name: name,
            $label: _.startCase(name),
            $readonly: 'true',
            $viewHint: 'designModeOnly',
            value: {
                $type: 'string',
                _: value
            }
        });
    }
});

