/**
 * ------------------------------------------------------------------------
 * Widget Accounts entry file
 * ------------------------------------------------------------------------
 */

'use strict';

// if the module has no dependencies, the above pattern can be simplified to
(function(root, factory) {
    var moduleName = '${widget.transforms.name.camelCase}';
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // only CommonJS-like environments that support module.exports,
        module.exports = factory(moduleName, root.angular, root.b$);
    } else {
        // Browser globals (root is window)
        root[moduleName] = factory(moduleName, root.angular, root.b$);
    }
}(this, function(name, angular, b$) {


    // Create Angular app
    function createApp(widget, deps) {
        return angular.module(name, deps || [])
            .controller('MainCtrl', function() {

            });
    }

    /**
     * Main Widget function
     * @param  {Object} widget instance
     * @return {Object}        Application object
     * @public
     */
    function ${widget.transforms.name.camelCase}(widget, deps) {
        var obj = Object.create(${widget.transforms.name.camelCase}.prototype);
        var args = Array.prototype.slice.call(arguments);
        obj.widget = widget;
        obj.app = createApp.apply(obj, args);
        return obj;
    }

    /**
     * Widget proto
     * @type {Object}
     */
    ${widget.transforms.name.camelCase}.prototype = {
        bootstrap: function() {
            angular.bootstrap(this.widget.body, [name]);
            return this;
        },
        destroy: function() {
            this.app = null;
        }
    };

    return ${widget.transforms.name.camelCase};
}));
