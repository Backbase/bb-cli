/**
 * Models
 * @module models
 */
define( function (require, exports) {

    'use strict';

    /**
     * @constructor
     * @ngInject
     */
    function WidgetModel(lpWidget) {
        this.data = [];
        this.widget = lpWidget;
    }
    /**
     * Export Models
     */
    exports.WidgetModel = WidgetModel;

});
