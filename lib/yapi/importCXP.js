var parseString = require('xml2js').parseString;
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var util = require('../util');
var finder = require('fs-finder');
var sorting = require('./modelSort');
var jxon = require('jxon');
var chalk = require('chalk');
var bbRest = require('mosaic-rest-js');
var Q = require('q');

jxon.config({
    valueKey: '_',        // default: 'keyValue'
    attrKey: '$',         // default: 'keyAttributes'
    attrPrefix: '$',      // default: '@'
    lowerCaseTags: false, // default: true
    trueIsEmpty: false,   // default: true
    autoDate: false      // default: true
});

var importConfig = {
    model: {
        templates: [],
        portals: [],
        catalog: {
            page: [],
            container: [],
            widget: []
        },
        pages: [],
        containers: [],
        widgets: [],
        links: [],
        groups: [],
        users: [],
        rightsList: [],
        advancedrights: []
    }
};


(function () {
    var importCXP = {};
    exports.startImport = importCXP.startImport = function (yapi) {
        'use strict';

        //TODO: go and hookup the configuration settings for your tools
        //config.getCommon();

        console.time('importCXP.startImport');

        var aJXON = [],
            oLocalModel = _.cloneDeep(importConfig.model);

        //itemTypes = 'template, portal, page, container, widget, link, group, user, rights';

        //Get all import xml files and push into global aJXON array
        getFiles('*.xml').forEach(function (item) {
            aJXON.push(jxon.stringToJs(item));
        });

        //Take all items and merge them into one object
        mergeJXONtoModel(oLocalModel, aJXON);

        //Sort model so that extended items and parents are first
        //TODO: Sorting broken
        oLocalModel = sorting.modelSort(oLocalModel);

        console.log('order');
        _.forEach(oLocalModel.catalog.widget, function(item) {
           console.log(item.catalog.widget.name);
        });

        getRemoteItems(oLocalModel);

        //TODO: we now post if we get a 404, but nothing if we already have
        // - compare properties _.isEqual
        // - put back if needed


        //console.log(JSON.stringify(oLocalModel));
        //console.log(_.pluck(oLocalModel.catalog.widget, 'name'));
        //console.log(_.pluck(oLocalModel.widgets, 'name'));
        //console.log(JSON.stringify(oLocalModel.widgets));
        //console.log(_.size(oLocalModel.widgets));
    };

    var getFiles = function (search) {
        var files = finder.in(process.cwd() + '\\lib\\yapi').findFiles(search),
            aFiles = [];

        files.filter(function (item) {
            aFiles.push(fs.readFileSync(item).toString());
        });

        return aFiles;
    };

    //Assumes all items use unique names and combines into one object
    var mergeJXONtoModel = function (oModelCollection, jxonArray) {
        try {
            jxonArray.filter(function (xFile) {
                for (var root in xFile) {
                    for (var child in xFile[root]) {

                        //If you have more than on widget/item in your xml file it'll be an array
                        if (_.isArray(xFile[root][child])) {
                            xFile[root][child].filter(function (item) {
                                var jxonPackage = {};
                                jxonPackage[root] = {};

                                //Sort catalog in to sub types
                                if (root === 'catalog') {
                                    //if (oModelCollection[root][child][item.name]) throw new Error('duplicate exists: ' + item.name);
                                    jxonPackage[root][child] = item;
                                    //oModelCollection[root][child][item.name] = jxonPackage;
                                    oModelCollection[root][child].push(jxonPackage);
                                } else {
                                    //if (oModelCollection[root][item.name]) throw new Error('duplicate exists: ' + item.name);
                                    jxonPackage[root][child] = item;
                                    //oModelCollection[root][item.name] = jxonPackage;
                                    oModelCollection[root].push(jxonPackage);
                                }
                            });
                        } else {
                            var jxonPackage = {};
                            jxonPackage[root] = {};

                            //Sort catalog in to sub types
                            if (root === 'catalog') {
                                //if (oModelCollection[root][child][xFile[root][child].name]) throw new Error('duplicate exists: ' + xFile[root][child].name);
                                jxonPackage[root][child] = xFile[root][child];
                                //oModelCollection[root][child][xFile[root][child].name] = jxonPackage;
                                oModelCollection[root][child].push(jxonPackage);

                            } else {
                                //if (oModelCollection[root][xFile[root][child].name]) throw new Error('duplicate exists: ' + xFile[root][child].name);
                                jxonPackage[root][child] = xFile[root][child];
                                //oModelCollection[root][xFile[root][child].name] = jxonPackage;
                                oModelCollection[root].push(jxonPackage);
                            }
                        }
                    }
                }
            });

            //console.log('done model merge');

        } catch (error) {
            console.log(chalk.bgRed('Error merging items into single object:'), error);
            process.exit(1);
        }
    };

    var getRemoteItems = function (oLocalModel) {
        //Set up the structure for the items to be placed
        var oRemoteModel = _.cloneDeep(importConfig.model),
        //TODO: Auto wire defaults
            bbrest = new bbRest//();
            ({
                plugin: function (o) {
                    return jxon.jsToString(o);
                }
            });

        var getQueue = [],
            postQueue = [],
            putQueue = [];

        //Loop through all items types to be imported based on local xml model
        for (var type in oLocalModel) {
            if (type === 'catalog') {
                for (var subtype in oLocalModel[type]) {
                    if (oLocalModel[type][subtype].length !== 0) {
                        console.log('check catalog..', subtype);
                        _.forEach(oLocalModel[type][subtype], function (item) {
                            //console.log('before getRemote..each..,', item);
                            getQueue.push(Q.fcall(getRemoteItem,item));
                        });
                    }
                }
            } else {
                if (oLocalModel[type].length !== 0) {
                    console.log('check..', type);
                    _.forEach(oLocalModel[type], function (item) {
                        getQueue.push(Q.nfcall(getRemoteItem,item));
                    });
                }
            }
        }

        Q.all(getQueue)
            .fail(function () {
                console.log('Q errors, ', arguments);
            })
            .then(function (data) {
                console.log('done all GETs.. start POSTs');
                Q.all(postQueue)
                    .fail(function () {
                        console.log('Q errors, ', arguments);
                    })
                    .then(function (data) {
                        console.log('done all POSTs.. start PUTs');

                    });
            });



        //not realy.. there are no promises collected so this is just after all requested have been sent not completed
        console.timeEnd('importCXP.startImport');


        function post(localItemPackage, myRemoteItemData, itemWrapper, itemType, bbRestType) {
            var localItem = localItemPackage[itemWrapper][itemType];
            console.log(myRemoteItemData.statusCode, 'posting..', localItem.name);

            var postPackage = itemWrapper === 'catalog' ? localItemPackage : localItemPackage[itemWrapper];

            //TODO: we are ok posting catalog item but not yet widgets/widget
            return bbrest[bbRestType]()
                //.post(jxon.jsToString(localItem))
                .post(postPackage)
                .then(function (postResponseData) {
                    switch (postResponseData.statusCode) {
                        case 204:
                        case 201:
                            console.log('Post Success..', postResponseData.statusCode, ':', localItem.name);
                            break;
                        case 302:
                        case 400:
                        case 404:
                            var message = postResponseData.body
                                .replace(/(<([^>]+)>)/ig , '')//Markup
                                .replace(/\r?\n|\r/g, ' ')//new lines
                                .replace(/\s+/g, ' ')//addtion spaces
                                .replace('Return to login page', '')//irrelevant message
                                .trim();
                            console.log('Post Error..', postResponseData.statusCode, ':', localItem.name, ' - ', message);
                            break;
                        default:
                            var message = postResponseData.body
                                .replace(/(<([^>]+)>)/ig , '')//Markup
                                .replace(/\r?\n|\r/g, ' ')//new lines
                                .replace(/\s+/g, ' ')//addtion spaces
                                .replace('Return to login page', '')//irrelevant message
                                .trim();
                            console.log('Post DefaultError..', postResponseData.statusCode, ':', localItem.name, ' - ', message);
                    }
                })
                .fail(function (e) {
                    console.log('failed pre-post..', e);
                });
        }

        //getRemoteItem('widgets', 'Standard_Widget_Sample-7358016');

        function getRemoteItem(localItemPackage) {
            var itemType,
                itemWrapper,
                bbRestType,
                localItem; //BBREST uses functions named after item not wrapper

            for (var wrapper in localItemPackage) {
                itemWrapper = wrapper;
                for (var type in localItemPackage[wrapper]) {
                    itemType = type;
                }
            }

            //remove wrappers
            localItem = localItemPackage[itemWrapper][itemType];

            bbRestType = itemWrapper === 'catalog' ? localItem.contextItemName !== '[BBHOST]' ? 'portalCatalog' : itemWrapper : itemType;

            //Start pointing to the correct portal
            bbrest.config.portal = localItem.contextItemName || 'server';

            return bbrest[bbRestType](localItem.name)
                .get()
                .then(function (myRemoteItemData) {
                    if ((myRemoteItemData.error &&
                        myRemoteItemData.statusCode == 200) ||
                        myRemoteItemData.statusCode == 404) {
                        //if the doesn't exist post for first time
                        postQueue.push(Q.nfcall(post, localItemPackage, myRemoteItemData, itemWrapper, itemType, bbRestType));

                        //post(localItemPackage, myRemoteItemData, itemWrapper, itemType, bbRestType);
                    } else if (!myRemoteItemData.error && myRemoteItemData.statusCode == 200) {
                        //so we should compare for deference before putting
                        console.log('Get Successful.. 200, comparing', localItem.name);

                        var remoteItem = jxon.stringToJs(_.unescape(myRemoteItemData.body));

                        remoteItem = remoteItem[itemWrapper] ? remoteItem[itemWrapper][itemType] : remoteItem[itemType];

                        var sanitizedItem;

                        for (var field in remoteItem){
                            if (!_.contains(['name',
                                            'contextItemName',
                                            'parentItemName',
                                            'extendedItemName',
                                            'properties',
                                            'tags'],
                                    field)){
                                delete remoteItem[field];
                            }
                        }


                        var namedPropertyCollection = {},
                            namedLabelsCollection = {};

                        _.forEach(remoteItem.properties.property, function(property) {
                            namedPropertyCollection[property.$name] = property;
                            namedLabelsCollection[property.$name] = property.$label;

                            delete property.$readonly;
                            delete property.$manageable;
                            delete property.$itemName;
                            delete property.$label;
                        });


                        if (localItem.properties) {
                            _.forEach(localItem.properties.property, function(localProperty) {
                                if (namedPropertyCollection[localProperty.$name]) {
                                    //TODO:compare values
                                    delete namedPropertyCollection[localProperty.$name];
                                    //console.log('found local and in remote');
                                }
                            });
                        }

                        //_.forEach(localItem.tags.tag, function(localTag) {
                        //    delete localTag.$manageable;
                        //});

                        localItem = _(localItem).keys().sort().__wrapped__;
                        remoteItem = _(remoteItem).keys().sort().__wrapped__;

                        if (localItem.properties) _.sortBy(localItem.properties.property, '$name');
                        if (remoteItem.properties) _.sortBy(remoteItem.properties.property, '$name');

                        if (localItem.tags) _.sortBy(localItem.tags.tag, '_');
                        if (remoteItem.tags) _.sortBy(remoteItem.tags.tag, '_');

                        console.log('l, ', JSON.stringify(localItem));
                        console.log('r, ', JSON.stringify(remoteItem));
                        //console.log(_.isEqual(localItem, remoteItem));


                    } else if (myRemoteItemData.statusCode == 302) {
                        console.log('Get.. 302 ', myRemoteItemData.body);
                    } else {
                        console.log('get default', myRemoteItemData.statusCode, localItem.name);
                        //console.log('got data, ',  jxon.stringToJs(_.unescape(myRemoteItemData.body)));
                    }


                    //var item = jxon.stringToJs(myRemoteItemData.body);
                    //oRemoteModel[itemGroup ][item[itemType].name] = item[itemType];

                    //console.log(_.pluck(oRemoteModel.widgets, 'name'));
                    //console.log('widget:', JSON.stringify(oRemoteModel));
                }).fail(function (e) {
                    console.log('pre-get fail: ', e);
                });
            //.finally(function(){
            //    console.log('finally: next..');
            //});


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