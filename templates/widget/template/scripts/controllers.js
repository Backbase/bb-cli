/**
 * Controllers
 * @module controllers
 */
define(function (require, exports) {

    'use strict';

    /**
     * Main controller
     * @ngInject
     * @constructor
     */
    function MainCtrl(WidgetModel) {
        this.model = WidgetModel;
    }

    /**
     * Export Controllers
     */
    exports.MainCtrl = MainCtrl;
});
