/**
 *  ----------------------------------------------------------------
 *  Copyright © Backbase B.V.
 *  ----------------------------------------------------------------
 *  Author : Backbase R&D - Amsterdam - New York
 *  Filename : main.js
 *  Description:
 *  Main File Module Sample
 *  ----------------------------------------------------------------
 */

define( function (require, exports, module) {

    'use strict';

    module.name = '<%=module_name%>';

    var base = require('base');
    var core = require('core');
    var ui = require('ui');

    var deps = [
        core.name,
        ui.name
    ];

    // @ngInject
    function run() {
        // module has started
    }

    module.exports = base.createModule(module.name, deps)
        .config( require('./config') )
        .constant( require('./utils') )
        .service( require('./services') )
        .provider( require('./providers') )
        .run( run );
});
