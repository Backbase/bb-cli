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
    function MainCtrl(WidgetModel, lpWidget, lpCoreUtils, lpCoreError) {
        this.model = WidgetModel;
        this.utils = lpCoreUtils;
        this.error = lpCoreError;
        this.widget = lpWidget;
    }

    /**
     * Export Controllers
     */
    exports.MainCtrl = MainCtrl;
});
