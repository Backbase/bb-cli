var parseString = require('xml2js').parseString;
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var util = require('../util');
var Finder = require('fs-finder');
var sorting = require('./modelSort');
var jxon  = require('jxon');

jxon.config({
    valueKey: '_',        // default: 'keyValue'
    attrKey: '$',         // default: 'keyAttributes'
    attrPrefix: '$',      // default: '@'
    lowerCaseTags: false, // default: true
    trueIsEmpty: false,   // default: true
    autoDate: false      // default: true
});


(function(){
    var importCXP = {};
    exports.startImport = importCXP.startImport = function(yapi){

        var aJXON = [],
            oModel = {
                templates: {},
                portals: {},
                catalog: {
                    page: {},
                    container: {},
                    widget: {}
                },
                pages: {},
                containers: {},
                widgets: {},
                links: {},
                groups: {},
                users: {},
                rightsList: {},
                advancedrights: {}
            },
            itemTypes = 'template, portal, page, container, widget, link, group, user, rights';


        getFiles('*.xml').forEach(function(item){
            aJXON.push(jxon.stringToJs(item));
        });

        aJXON.filter(function(xFile){
            for (var root in xFile) {
                for (var child in xFile[root]) {
                    //If you have more than on widget/item in your xml file it'll be an array
                    if (_.isArray(xFile[root][child])){
                        xFile[root][child].filter(function (item) {
                            //console.log(child);
                            oModel[root][child][item.name] = item;
                        });
                    } else {
                        oModel[root][xFile[root][child].name] = xFile[root][child];
                    }
                }
            }
        });

        //console.log('catalog widgets1.0: ',_.size(aJXON[0].catalog.widget));
        //_.forEach(aJXON[0].catalog.widget, function(n){
        //  console.log('cat1: ', n)
        //});

        //console.log('catalog widgets2.0: ',_.size(aJXON[1].catalog.widget));
        //_.forEach(aJXON[1].catalog.widget, function(n){
        //    console.log('cat2: ', n)
        //});


        //Done: take from yapi object builder for items to generate types, and try and get a normal widget added into the widgets section,


        //TODO: no we have a sorted catalog of widgets,
        // check widget.length
        // - take sorted model, and get a widget to compare from rest
        // - compare properties _.isEqual
        // - put back if needed


        console.log('separated sort');
        oModel = sorting.modelSort(oModel);

        console.log(JSON.stringify(oModel));

        console.log(_.pluck(oModel.catalog.widget, 'name'));


    };



    var getFiles = function(search) {
        var files = Finder.in(process.cwd() + '\\lib\\yapi').findFiles(search),
            aFiles = [];

        files.filter(function(item){
            aFiles.push(fs.readFileSync(item).toString());
        });

        return aFiles;
    };


    if (!module.parent) {
        importCXP.startImport(process.argv[2]);
    }
})();