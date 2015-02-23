var parseString = require('xml2js').parseString;
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var util = require('../util');
var finder = require('fs-finder');
var sorting = require('./modelSort');
var jxon  = require('jxon');
var chalk = require('chalk');
var bbRest = require('mosaic-rest-js');

jxon.config({
    valueKey: '_',        // default: 'keyValue'
    attrKey: '$',         // default: 'keyAttributes'
    attrPrefix: '$',      // default: '@'
    lowerCaseTags: false, // default: true
    trueIsEmpty: false,   // default: true
    autoDate: false      // default: true
});

var importConfig = {model:{
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
}};


(function(){
    var importCXP = {};
    exports.startImport = importCXP.startImport = function(yapi){
        'use strict';

        console.time('importCXP.startImport');

        var aJXON = [],
            oLocalModel = _.cloneDeep(importConfig.model);

            //itemTypes = 'template, portal, page, container, widget, link, group, user, rights';

        //Get all import xml files and push into global aJXON array
        getFiles('*.xml').forEach(function(item){
            aJXON.push(jxon.stringToJs(item));
        });

        //Take all items and merge them into one object
        mergeJXONtoModel(oLocalModel, aJXON);


        //Sort model so that extended items and parents are first
        oLocalModel = sorting.modelSort(oLocalModel);


        getRemoteItems(oLocalModel);



        //TODO: no we have a sorted catalog of widgets,
        // - take sorted model, and get a widget to compare from rest
        // - compare properties _.isEqual
        // - put back if needed



        //console.log(JSON.stringify(oLocalModel));

        console.log(_.pluck(oLocalModel.catalog.widget, 'name'));
        console.log(_.pluck(oLocalModel.widgets, 'name'));

        console.log(JSON.stringify(oLocalModel.widgets));

        console.log(_.size(oLocalModel.widgets));


        //End of app.
        console.timeEnd('importCXP.startImport');


    };

    var getFiles = function(search) {
        var files = finder.in(process.cwd() + '\\lib\\yapi').findFiles(search),
            aFiles = [];

        files.filter(function(item){
            aFiles.push(fs.readFileSync(item).toString());
        });

        return aFiles;
    };

    //Assumes all items use unique names and combines into one object
    var mergeJXONtoModel = function(oModelCollection, jxonArray){
        try {
            jxonArray.filter(function(xFile){
                for (var root in xFile) {
                    for (var child in xFile[root]) {
                        //If you have more than on widget/item in your xml file it'll be an array
                        if (_.isArray(xFile[root][child])){
                            xFile[root][child].filter(function (item) {
                                //Sort catalog in to sub types
                                if (root === 'catalog') {
                                    if (oModelCollection[root][child][item.name]) throw new Error('duplicate exists: ' + item.name);
                                    oModelCollection[root][child][item.name] = item;
                                } else {
                                    if (oModelCollection[root][item.name]) throw new Error('duplicate exists: ' + item.name);
                                    oModelCollection[root][item.name] = item;
                                }
                            });
                        } else {
                            //Sort catalog in to sub types
                            if (root === 'catalog') {
                                if (oModelCollection[root][child][xFile[root][child].name]) throw new Error('duplicate exists: ' + xFile[root][child].name);
                                oModelCollection[root][child][xFile[root][child].name] = xFile[root][child];
                            } else {
                                if (oModelCollection[root][xFile[root][child].name]) throw new Error('duplicate exists: ' + xFile[root][child].name);
                                oModelCollection[root][xFile[root][child].name] = xFile[root][child];
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.log(chalk.bgRed('Error merging items into single object:'), error);
            process.exit(1);
        }
    };

    var getRemoteItems = function(oLocalModel) {
        //Set up the structure for the items to be placed
        var oRemoteModel = _.cloneDeep(importConfig.model),
            bbrest = new bbRest({
                plugin: jxon
            });

        //Setup general config based on internal defaults
        //TODO: Auto wire defaults
        bbrest.config = {
            host: bbrest.config.host,
            port: bbrest.config.port,
            context: bbrest.config.context,
            username: bbrest.config.username,
            password: bbrest.config.password,
            portal: bbrest.config.portal
        };

        //Loop through all items types to be imported based on local xml model
        for (var type in oLocalModel) {
            if (type === 'catalog') {
                for (var subtype in oLocalModel[type]) {
                    if (oLocalModel[type][subtype].length !== 0) {
                        console.log('check catalog..', subtype);
                        _.forEach(oLocalModel[type][subtype], function(item) {
                            getRemoteItem(item, subtype);
                        });
                    }
                }
            } else {
                if (oLocalModel[type].length !== 0) {
                    console.log('check..', type);
                    _.forEach(oLocalModel[type], function(item) {
                        getRemoteItem(item, type);
                    });
                }
            }
        }

        //getRemoteItem('widgets', 'Standard_Widget_Sample-7358016');

        function getRemoteItem(localItem, itemGroup) {

            var itemType,
                isCatalogItem;

            //refactor types to match rest api
            //TODO: Align BBrest to REST API
            if (bbrest[itemGroup]) {
                itemType =  itemGroup;
            } else {
                isCatalogItem = true;
                itemType = itemGroup.slice(0, -1);
            }

            //temp setup a test portal name
            //TODO: change in bbrest
            _.merge(bbrest.config, {
                portal: 'testa'
            });

            bbrest[itemType](localItem.name)
                .get()
                .then(function(data){

                    console.log('sts:', data.statusCode);

                    switch(data.statusCode) {
                        case 404:
                            console.log('Item not found, posting..');
                            //TODO: put new item
                            try {
                                var jxonPackage = {};
                                jxonPackage[itemType] = localItem;

                                bbrest[itemType]()
                                    .post(jxon.jsToString(jxonPackage))
                                    .then(function(data){
                                        console.log('posted..', data.statusCode,':',data);
                                    })
                                    .fail(function(data){
                                        console.log('failed post..', data,':',data);
                                    });

                            } catch(e){
                                console.log('failed post..', e);
                            }

                            break;
                        case 302:
                            console.log('302');
                            break;
                        default:
                            console.log('switch default');
                    }


                    var item = jxon.stringToJs(data.body);

                    oRemoteModel[itemGroup ][item[itemType].name] = item[itemType];

                    console.log(_.pluck(oRemoteModel.widgets, 'name'));
                    console.log('widget:', JSON.stringify(oRemoteModel));
                }).fail(function(data){
                    console.log('fail: ', data);
                }).finally(function(){
                    console.log('finally: next..');
                });


            //bbrest.server().get().then(function(data){
            //    mergeJXONtoModel(oRemoteModel, [jxon.stringToJs(data.body)]);
            //    console.log(_.pluck(oRemoteModel.portals, 'name'));
            //    console.log('portals:', JSON.stringify(oRemoteModel));
            //});

        }

    };

    if (!module.parent) {
        importCXP.startImport(process.argv[2]);
    }
})();