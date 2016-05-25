/**
 * ------------------------------------------------------------------------
 * ${widget.transforms.name.camelCase} entry point
 * ------------------------------------------------------------------------
 */
(function(window, factory) {
    var name = '${widget.transforms.name.camelCase}';
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], function() { return factory(name); });
    } else if (typeof module === 'object' && module.exports) {
        // only CommonJS-like environments that support module.exports,
        module.exports = factory(name);
    } else {
        // Browser globals (root is window)
        window[name] = factory(name);
    }
}(this, function(name) {
    var bus = window.gadgets.pubsub;
    var ng = window.angular;

    /**
     * Main Controller
     * @param {object} widget cxp widget instance
     */
    function MainCtrl(widget) {
        this.hello = widget.id
    }
     /**
     * Error Controller
     * Binds the widget errors to the view
     * @param {object} widget cxp widget instance
     */
    function ErrorCtrl(widget) {

    }

    /**
     * Create Angular Module
     * @param  {object} widget widget instance
     * @param  {array} deps   angular modules dependencies
     * @return {object}        angular module
     */
    function createModule(widget, deps) {
        return ng.module(name, deps || [])
            .value('widget', widget)
            .controller('MainCtrl', ['widget', MainCtrl])
            .controller('ErrorCtrl', ['widget', ErrorCtrl]);
    }

    /**
     * Main Widget function
     * @param  {object} widget instance
     * @return {object}        Application object
     * @public
     */
    function App(widget, deps) {
        var obj = Object.create(App.prototype);
        var args = Array.prototype.slice.call(arguments);
        obj.widget = widget;
        obj.module = createModule.apply(obj, args);
        return obj;
    }

    /**
     * Widget proto
     * @type {object}
     */
    App.prototype = {
        bootstrap: function() {
            ng.bootstrap(this.widget.body, [this.module.name]);
            return this;
        },
        destroy: function() {
            this.module = null;
        }
    };

    return App;
}));
