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
var pointer = require('json-pointer');
var inquirer = require("inquirer");


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
    exports.startImport = importCXP.startImport = function () {
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
        oLocalModel = sorting.modelSort(oLocalModel);

        //GET, POST/COMPARE & PUT,
        processItems(oLocalModel);
    };

    var getFiles = function (search) {
        var files = finder.in(process.cwd() + '\\test\\import').findFiles(search),
            aFiles = [];

        //TODO: finder is not very flexible, better wild card find needed, suggest using glob

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

    var processItems = function (oLocalModel) {
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
                        console.log('adding catalog..', subtype);
                        _.forEach(oLocalModel[type][subtype], function (item) {
                            //console.log('before getRemote..each..,', item);
                            getQueue.push(item);
                        });
                    }
                }
            } else {
                if (oLocalModel[type].length !== 0) {
                    console.log('adding..', type);
                    _.forEach(oLocalModel[type], function (item) {
                        getQueue.push(item);
                    });
                }
            }
        }

        var getPromises = getQueue.reduce(function (promise, item) {
            return promise.then(function () {
                return getRemoteItem(item);
            });
        }, Q.resolve());

        getPromises.then(function () {
            console.log('done all GETs.. start POSTs');

            var postPromises = postQueue.reduce(function (promise, item) {
                return promise.then(function () {
                    return post(item);
                });
            }, Q.resolve());

            postPromises.then(function () {
                console.log('done all POSTs.. start PUTs');

            });


            //inquirer.prompt([{
            //        message: 'Do you want to update your model?',
            //        name: 'confirm',
            //        type: 'confirm'
            //    }],
            //    function (answers) {
            //        console.log('asas', answers);
            //
            //        if (answers.confirm) {
                        var putPromises = putQueue.reduce(function (promise, item) {
                            return promise.then(function () {
                                return put(item);
                            });
                        }, Q.resolve());

                        putPromises.then(function () {
                            console.log('done all PUTs.. ');

                            //not really.. the posts could still be going
                            console.timeEnd('importCXP.startImport');
                        });
                    //}
                //}
            //);
        });

      function put(localItemPackage) {
            var itemWrapper = getFirstChildName(localItemPackage),
                itemType = getFirstChildName(localItemPackage[itemWrapper]),
                localItem = localItemPackage[itemWrapper][itemType], //BBREST uses functions named after item not wrapper
                bbRestType = itemWrapper === 'catalog' ? localItem.contextItemName !== '[BBHOST]' ? 'portalCatalog' : itemWrapper : itemType;

            var putPackage = itemWrapper === 'catalog' ? localItemPackage : localItemPackage[itemWrapper];

            return bbrest[bbRestType]()
                //.post(jxon.jsToString(localItem))
                .put(putPackage)
                .then(function (putResponseData) {
                    switch (putResponseData.statusCode) {
                        case 204:
                        case 201:
                            console.log('Put Success..', putResponseData.statusCode, ':', localItem.name);
                            break;
                        case 302:
                        case 400:
                        case 404:
                            var message = putResponseData.body
                                .replace(/(<([^>]+)>)/ig, '')//Markup
                                .replace(/\r?\n|\r/g, ' ')//new lines
                                .replace(/\s+/g, ' ')//additional spaces
                                .replace('Return to login page', '')//irrelevant message
                                .trim();
                            console.log('Put Error..', putResponseData.statusCode, ':', localItem.name, ' - ', message);
                            break;
                        default:
                            var message = putResponseData.body
                                .replace(/(<([^>]+)>)/ig, '')//Markup
                                .replace(/\r?\n|\r/g, ' ')//new lines
                                .replace(/\s+/g, ' ')//additional spaces
                                .replace('Return to login page', '')//irrelevant message
                                .trim();
                            console.log('Put DefaultError..', putResponseData.statusCode, ':', localItem.name, ' - ', message);
                    }
                })
                .fail(function (e) {
                    console.log('failed pre-post..', e);
                });
        }


        function post(localItemPackage) {
            var itemWrapper = getFirstChildName(localItemPackage),
                itemType = getFirstChildName(localItemPackage[itemWrapper]),
                localItem = localItemPackage[itemWrapper][itemType], //BBREST uses functions named after item not wrapper
                bbRestType = itemWrapper === 'catalog' ? localItem.contextItemName !== '[BBHOST]' ? 'portalCatalog' : itemWrapper : itemType;

            var postPackage = itemWrapper === 'catalog' ? localItemPackage : localItemPackage[itemWrapper];

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
                                .replace(/(<([^>]+)>)/ig, '')//Markup
                                .replace(/\r?\n|\r/g, ' ')//new lines
                                .replace(/\s+/g, ' ')//addtion spaces
                                .replace('Return to login page', '')//irrelevant message
                                .trim();
                            console.log('Post Error..', postResponseData.statusCode, ':', localItem.name, ' - ', message);
                            break;
                        default:
                            var message = postResponseData.body
                                .replace(/(<([^>]+)>)/ig, '')//Markup
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

        function getFirstChildName(object) {
            for (var name in object) {
                return name;
            }
        }

        function getDifferences(localItemPackage, remoteItemPackage) {
            var itemWrapper = getFirstChildName(localItemPackage),
                itemType = getFirstChildName(localItemPackage[itemWrapper]),
                localItem = localItemPackage[itemWrapper][itemType],
                remoteItem = remoteItemPackage[itemWrapper] ? remoteItemPackage[itemWrapper][itemType] : remoteItemPackage[itemType],
                difference = null;

            remoteItem = sanitizeItem(remoteItem);
            localItem = sanitizeItem(localItem);

            remoteItem = deepSortItem(remoteItem);
            localItem = deepSortItem(localItem);

            var isEqual = _.isEqual(localItem, remoteItem);

            console.log('is equal: ', localItem.name, ':', isEqual);

            if (!isEqual) {
                //TODO: if tag on remote are removed from local put as blacklist
                //TODO: get revealDifferences only to return what to be updated
                //TODO: ON FORCE OVERRIDE if remote properties are not listed locally then remove properties by putting attr markedfordeletion
                difference = revealDifferences(localItem, remoteItem);
            }

            return difference;
        }

        function deepSortItem(item) {
            item = sortObject(item);

            if (item.properties) item.properties.property = _.sortBy(item.properties.property, '$name');

            if (item.tags) {
                item.tags.tag = _.sortBy(item.tags.tag, '$type');
                item.tags.tag = _.sortBy(item.tags.tag, '_');
            }

            return item;
        }

        function sortObject(object) {
            var sortedObj = {}
                ,
                keys = _.keys(object);

            keys = _.sortBy(keys, function (key) {
                return key;
            });

            _.each(keys, function (key) {
                sortedObj[key] = object[key];
            });

            //_(object)
            //    .keys()
            //    .sortBy(function(key){
            //        return key;
            //    })
            //    .each(function(key) {
            //        sortedObj[key] = object[key];
            //    });

            return sortedObj;
        }

        function sanitizeItem(item) {

            for (var field in item) {
                if (!_.contains(['name',
                            'contextItemName',
                            'parentItemName',
                            'extendedItemName',
                            'properties',
                            'tags'],
                        field)) {
                    delete item[field];
                }
            }

            //Remote items remove the [] from the extended items name,
            // so we will remove the local ones to match
            if (item.extendedItemName) {
                //As the remote item has removed its brackets we will follow :(
                //TODO: Raise with CXP team
                item.extendedItemName = item.extendedItemName.replace(/\[|\]/g, '');
                if (item.contextItemName !== '[BBHOST]' && item.tags) {
                    //TODO: Check tags inheritance and raise with CXP team
                    //As the remote item is showing inherited tags, with no way if knowing if
                    // these are owned or inherited we will assume extended items can't own tags and remove them
                    delete item.tags
                }
            }

            if (item.properties) {
                var removeInheritedProperties = {};

                _.forEach(item.properties.property, function (property, i) {
                    if (property.$itemName && property.$itemName === item.name) {
                        delete property.$readonly;
                        delete property.$manageable;
                        delete property.$itemName;
                    } else if (property.$itemName) {
                        removeInheritedProperties[property.$name] = true;
                    }
                });

                //when reading rest remove inherited values so matches local version
                _.remove(item.properties.property, function (value) {
                    return removeInheritedProperties[value.$name] ? true : false;
                });
            } else {
                //Local items dont have empty properties tag like remotes do, we add to match
                item.properties = {'property': []};
            }

            return item;
        }

        function revealDifferences(localItem, remoteItem) {
            //Flattens all objects values into array of strings
            var recLooper = function (object, array, messageChain) {
                _.forEach(object, function (item, key) {
                    var message;
                    if (_.isObject(item) || _.isArray(item)) {
                        message = key;
                        if (messageChain) {
                            message = messageChain + '/' + key;
                        }
                        recLooper(item, array, message);
                    } else {
                        message = key + '/' + item;
                        if (messageChain) {
                            message = messageChain + '/' + message;
                        }
                        array.push(message);
                    }
                })
            };

            var arrayLocal = [];
            recLooper(localItem, arrayLocal);

            var arrayRemote = [];
            recLooper(remoteItem, arrayRemote);

            var differencesAtLocal = _.difference(arrayLocal, arrayRemote);

            var differencesAtRemote = _.difference(arrayRemote, arrayLocal);

            var localItemChangesOnly = _.cloneDeep(localItem, function(item){
                if (item.properties.property) item.properties.property = [];
                if (item.tags.tag) item.tags.tag = [];
                return item;
            });

            _.forEach(differencesAtLocal, function (diff) {
                var propertyJsonPointer = 'properties/property',
                    tagJsonPointer = 'tags/tag',
                    newDiff = diff.split('/');

                if (diff.indexOf(propertyJsonPointer) != -1) {
                    newDiff.pop();

                    var diffValuePointer = '/' + newDiff.join('/'),
                        propertyIndex = diff.substring(propertyJsonPointer.length + 1, diff.indexOf('/',propertyJsonPointer.length + 1) - 1),
                        propertyObjectPointer = '/' + propertyJsonPointer + '/' + propertyIndex,
                        propertyTilePointer = propertyObjectPointer + '/$name';


                    //localItemChangesOnly.properties.property.push(pointer.get(remoteItem, propertyObjectPointer));

                    console.log('Property Changed: "' + pointer.get(remoteItem, propertyTilePointer) + '"');
                    console.log('local :', '/' + diff);

                    if (pointer.get(remoteItem, diffValuePointer)) {
                        console.log('Remote:', diffValuePointer + '/' + pointer.get(remoteItem, diffValuePointer));
                    }
                    //I don't thing this will happen on local differences check
                    //else {
                    //    console.log('Remote: Property does not exist')
                    //}

                } else if(diff.indexOf(tagJsonPointer) != -1) {
                    var diffValuePointer = '/' + newDiff.join('/'),
                        tagIndex = diff.substring(tagJsonPointer.length + 1, diff.indexOf('/', tagJsonPointer.length + 1)),
                        tagObjectPointer = '/' + tagJsonPointer + '/' + tagIndex;


                    localItemChangesOnly.tags.tag.push(pointer.get(remoteItem, tagObjectPointer));

                    console.log('local Tag:', '/' + diff);
                } else {
                    console.log('change:', '/' + diff);
                }
            });

            //TODO:Make diffloop of remote and mark tags as blacklisted and addtional remote properties as mark for delete


            return localItemChangesOnly;
        }

        function getRemoteItem(localItemPackage) {
            var itemWrapper = getFirstChildName(localItemPackage),
                itemType = getFirstChildName(localItemPackage[itemWrapper]),
                localItem = localItemPackage[itemWrapper][itemType], //BBREST uses functions named after item not wrapper
                bbRestType = itemWrapper === 'catalog' ? localItem.contextItemName !== '[BBHOST]' ? 'portalCatalog' : itemWrapper : itemType;

            //Start pointing to the correct portal
            bbrest.config.portal = localItem.contextItemName || 'server';

            return bbrest[bbRestType](localItem.name)
                .get()
                .then(function (myRemoteItemData) {
                    if ((myRemoteItemData.error &&
                        myRemoteItemData.statusCode == 200) ||
                        myRemoteItemData.statusCode == 404) {

                        console.log(myRemoteItemData.statusCode, 'adding to post queue', localItem.name);

                        //if the doesn't exist post for first time
                        postQueue.push(localItemPackage);

                    } else if (!myRemoteItemData.error && myRemoteItemData.statusCode == 200) {
                        //so we should compare for deference before putting
                        console.log('Get Successful.. 200, comparing', localItem.name);

                        var remoteItemPackage = jxon.stringToJs(_.unescape(myRemoteItemData.body));

                        var putPackage = getDifferences(localItemPackage, remoteItemPackage);

                        if (putPackage) {
                            putQueue.push(localItemPackage);
                        }
                    } else if (myRemoteItemData.statusCode == 302) {
                        console.log('Get.. 302 ', myRemoteItemData.body);
                    } else {
                        console.log('get default', myRemoteItemData.statusCode, localItem.name);
                        //console.log('got data, ',  jxon.stringToJs(_.unescape(myRemoteItemData.body)));
                    }

                }).fail(function (e) {
                    console.log('pre-get fail: ', e);
                });
        }

    };

    if (!module.parent) {
        importCXP.startImport(process.argv[2]);
    }
})();
