/**
 *  ----------------------------------------------------------------
 *  Copyright © <%= module_author%>.
 *  ----------------------------------------------------------------
 *  Author : <%= module_author%>
 *  Filename : main.js
 *  Description:
 *  Main File <%=module_name%>
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
