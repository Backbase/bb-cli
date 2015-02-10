var parseString = require('xml2js').parseString;
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var util = require('../lib/util');

(function(){
    var importCXP = {};
    exports.startImport = importCXP.startImport = function(yapi){
        //your logic to create a report
        console.log('DO YAPI');

    };

    if (!module.parent) {
        importCXP.startImport(process.argv[2]);
    }
})();