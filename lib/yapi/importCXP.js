'use strict';

var fs = require('fs');
var _ = require('lodash');
var glob = require('glob');
var sorting = require('./modelSort');
var jxon = require('jxon');
var chalk = require('chalk');
var config = require('../config');
var util = require('../util');
var Q = require('q');
var path = require('path');

var importConfig = {
    model: {
        templates: [],
        portals: [],
        catalog: {
            page: [],
            container: [],
            widget: [],
            template: []
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

jxon.config({
    valueKey: '_',        // default: 'keyValue'
    attrKey: '$',         // default: 'keyAttributes'
    attrPrefix: '$',      // default: '@'
    lowerCaseTags: false, // default: true
    trueIsEmpty: false,   // default: true
    autoDate: false      // default: true
});

var queues = {};
var _cliOpts = {};
var bbrest;

exports.startImportSimple = function (cliOpts) {
    _cliOpts = cliOpts || {};

    console.log('Start import...');

    var globFiles = [];

    glob.sync(_cliOpts.search || path.join(process.cwd(), '*.xml')).map(function (item) {
        globFiles.push(item);
    });

    config.getCommon(_cliOpts)
        .then(function(r) {
            bbrest = r.bbrest;

            bbrest.import().post(globFiles[0]).then(function(msg){
                console.log('Import finished.');

                if (!msg.error) {
                    util.ok('Import success:', msg.statusCode);
                } else {
                    util.err('Import failed:', msg.statusInfo);
                }
            });
        })
        .fail(function(e) {
            util.err(chalk.red('Error getting options: '), e);
            util.err(e.stack);
        });
};

var startImport = exports.startImport = function (cliOpts) {
    _cliOpts = cliOpts || {};

    console.time('importCXP.startImport');

    var aJXON = [],
        oLocalModel = _.cloneDeep(importConfig.model);


    //Get all import xml files and push into global aJXON array
    getFiles(_cliOpts.search || path.join(process.cwd(), '*.xml')).forEach(function (item) {
        aJXON.push(jxon.stringToJs(item));
    });

    console.log('Found', aJXON.length, 'files');

    if (aJXON.length === 0) {
        console.log('No file matched search:', _cliOpts.search || path.join(process.cwd() + '/*.xml'));
        return;
    }

    //Take all items and merge them into one object
    mergeJXONtoModel(oLocalModel, aJXON);

    //Sort model so that extended items and parents are first
    oLocalModel = sorting.modelSort(oLocalModel);

    prepareQueues(oLocalModel);

    config.getCommon(_cliOpts)
        .then(function(r) {
            bbrest = r.bbrest;

            //GET, POST/COMPARE & PUT,
            processItems();
        })
        .fail(function(e) {
            console.log(chalk.red('bb prop error: '), e);
            console.log(e.stack);
        });
};

var getFiles = function (search) {
    return glob
          .sync(search)
          .map(function (item) {
              return fs.readFileSync(item).toString();
          });
};

//Assumes all items use unique names and combines into one object
var mergeJXONtoModel = function (oModelCollection, jxonArray) {
    try {
        jxonArray.filter(function (xFile) {
            var root, child;


            var addtoModelCollection = function (item) {
                var jxonPackage = {};
                jxonPackage[root] = {};

                //Sort catalog in to sub types
                if (root === 'catalog') {
                    var target = oModelCollection[root][child];

                    //if (oModelCollection[root][child][item.name]) throw new Error('duplicate exists: ' + item.name);
                    jxonPackage[root][child] = item;
                    //oModelCollection[root][child][item.name] = jxonPackage;
                    if (_.isArray(target)) target.push(jxonPackage);
                } else {
                    var target = oModelCollection[root];

                    //if (oModelCollection[root][item.name]) throw new Error('duplicate exists: ' + item.name);
                    jxonPackage[root][child] = item;
                    //oModelCollection[root][item.name] = jxonPackage;
                    if (_.isArray(target)) target.push(jxonPackage);
                }
            };

            for (root in xFile) {
                for (child in xFile[root]) {
                    //If you have more than on widget/item in your xml file it'll be an array
                    if (_.isArray(xFile[root][child])) {
                        _.forEach(xFile[root][child], addtoModelCollection);
                    } else {
                        addtoModelCollection(xFile[root][child]);
                    }
                }
            }
        });

    } catch (error) {
        console.log(chalk.bgRed('Error merging items into single object:'), error);
        process.exit(1);
    }
};

var prepareQueues = function(oLocalModel) {
    var getQueue = [],
        putQueue = [],
        postQueue = [];

    //Basic test to ensure portal catalog items don't submit tags
    function validateItem(item) {
        if (item.extendedItemName && item.tags) {
            throw new Error(
                'You can only use tags at server ' +
                'catalog and not extended items (' +
                'workaround: just do you tagging in portal manager' +
                'if its important ;) ): ' + item.name);
        }
    }

    function addToQueue(item) {
        validateItem(item);
        getQueue.push(item);
    }

    //Loop through all items types to be imported based on local xml model
    for (var type in oLocalModel) {
        if (type === 'catalog') {
            for (var subtype in oLocalModel[type]) {
                if (oLocalModel[type][subtype].length !== 0) {
                    console.log('adding catalog..', subtype);
                    _.forEach(oLocalModel[type][subtype], addToQueue);
                }
            }
        } else {
            if (oLocalModel[type].length !== 0) {
                console.log('adding..', type);
                _.forEach(oLocalModel[type], addToQueue);
            }
        }
    }

    queues = {
        getQueue: getQueue,
        putQueue: putQueue,
        postQueue: postQueue
    };

};

var processItems = function () {

    var getPromises = queues.getQueue.reduce(function (promise, item) {
        return promise.then(function () {
            return get(item);
        });
    }, Q.resolve());


    getPromises.then(function () {
        console.log('done all GETs.. ');
        if (queues.postQueue.length > 0) {
            console.log('starting', queues.postQueue.length, 'POSTs');

            var postPromises = queues.postQueue.reduce(function (promise, item) {
                return promise.then(function () {
                    return post(item);
                });
            }, Q.resolve());

            postPromises.then(function () {
                console.log('done all POSTs..');

            });

        } else {
            console.log('No POSTS');
        }


        if (queues.putQueue.length > 0) {
            console.log('starting', queues.putQueue.length, 'PUTs');


            var putPromises = queues.putQueue.reduce(function (promise, item) {
                return promise.then(function () {
                    return put(item);
                });
            }, Q.resolve());

            putPromises.then(function () {
                console.log('done all PUTs.. ');

                //not really.. the posts could still be going
                console.timeEnd('importCXP.startImport');
            });
        } else {
            console.log('No PUTS');
        }

    });


    function parseResponseToString(response) {
        return response
            .replace(/(<([^>]+)>)/ig, '')//Markup
            .replace(/\r?\n|\r/g, ' ')//new lines
            .replace(/\s+/g, ' ')//additional spaces
            .replace('Return to login page', '')//irrelevant message
            .trim();
    }


    //Type = ether the whole thing, or just a fragment with deletes etc. The we
    // dont need to wrap etc.
    function put(ItemPackage) {
        var itemWrapper, itemType, localItem, bbRestType, putPackage;

        itemWrapper = getFirstChildName(ItemPackage);
        itemType = getFirstChildName(ItemPackage[itemWrapper]);
        localItem = ItemPackage[itemWrapper][itemType]; //BBREST uses functions named after item not wrapper
        bbRestType = itemWrapper === 'catalog' ? localItem.contextItemName !== '[BBHOST]' ? 'portalCatalog' : itemWrapper : itemType;
        putPackage = itemWrapper === 'catalog' ? ItemPackage : ItemPackage[itemWrapper];

        return bbrest[bbRestType]()
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
                        console.log('Put Error..',
                                     putResponseData.statusCode, ':',
                                     localItem.name, ' - ',
                                     parseResponseToString(putResponseData.body));
                        break;
                    default:
                        console.log('Put DefaultError..',
                                     putResponseData.statusCode, ':',
                                     localItem.name, ' - ',
                                     parseResponseToString(putResponseData.body));
                }
            })
            .fail(function (e) {
                console.log('failed pre-put..', e);
                console.log(e.stack);
            });
    }

    function post(localItemPackage) {
        var itemWrapper = getFirstChildName(localItemPackage),
            itemType = getFirstChildName(localItemPackage[itemWrapper]),
            localItem = localItemPackage[itemWrapper][itemType], //BBREST uses functions named after item not wrapper
            bbRestType = itemWrapper === 'catalog' ? localItem.contextItemName !== '[BBHOST]' ? 'portalCatalog' : itemWrapper : itemType;

        var postPackage = itemWrapper === 'catalog' ? localItemPackage : localItemPackage[itemWrapper];

        return bbrest[bbRestType]()
            .post(postPackage)
            .then(function (postResponseData) {
                switch (postResponseData.statusCode) {
                    case 204:
                    case 201:
                        console.log('Post Success..',
                            postResponseData.statusCode, ':',
                            localItem.name);
                        break;
                    case 302:
                    case 400:
                    case 404:
                        console.log('Post Error..',
                            postResponseData.statusCode, ':',
                            localItem.name, ' - ',
                            parseResponseToString(postResponseData.body));
                        break;
                    default:
                        console.log('Post DefaultError..',
                            postResponseData.statusCode, ':',
                            localItem.name, ' - ',
                            parseResponseToString(postResponseData.body));
                }
            })
            .fail(function (e) {
                console.log('failed pre-post..', e);
                console.log(e.stack);
            });
    }

    function getFirstChildName(object) {
        for (var name in object) {
            return name;
        }
    }

    /**
     * Compares to complete xml packages containing any model item wrapped with the correct tags
     * conforming the the BBrest specification.
     * @param {object} localItemPackage - item read from xml file
     * @param {object} remoteItemPackage - item retrieved from server
     * @returns {object}  - item containing only changes between local and
     *          remote for submition to backbase REST api, if local includes
     *          deleted properties/tags these will also be marked to be removed remotely
     */
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


        if (!isEqual) {
            //TODO: if tag on remote are removed from local put as blacklist
            //TODO: get revealDifferences only to return what to be updated
            //TODO: ON FORCE OVERRIDE if remote properties are not listed locally then remove properties by putting attr markedfordeletion
            difference = revealDifferences(localItem, remoteItem);

            // Projects may want to only add new properties not remove any from the server, if
            // Options.cleanup = false we will find local and remote may not match, then we are only
            // interested in local new field changes so we will compare  here
            if (
                difference.properties &&
                difference.properties.property.length === 0 &&
                difference.tags && difference.tags.tag.length === 0
            ) {

                if (localItem.properties) delete localItem.properties;
                if (localItem.tags) delete localItem.tags;
                if (remoteItem.properties) delete remoteItem.properties;
                if (remoteItem.tags) delete remoteItem.tags;

                isEqual = _.isEqual(localItem, remoteItem);
            }

            //Repackage the object into a put friendly format
            var diffPackage = {};
            diffPackage[itemWrapper] = {};
            diffPackage[itemWrapper][itemType] = sanitizeItem(difference);

            //Final check when differences remote are to be ignored
            difference = isEqual ? null : diffPackage;
        }

        console.log('is equal: ', localItem.name, ':', isEqual);


        return difference;
    }

    /**
     * Sort JSON object representing backbase Item, also sorts the properties and tag arrays
     * @param {object} item
     * @returns {object} sorted item
     */
    function deepSortItem(item) {
        item = sortObject(item);

        if (item.properties) {
            item.properties.property = _.sortBy(item.properties.property, '$name');
        }

        if (item.tags && item.tags.tag) {
            item.tags.tag = _.sortBy(item.tags.tag, '$type');
            item.tags.tag = _.sortBy(item.tags.tag, '_');
        }

        return item;
    }

    /**
     * Sorts the Objects top level Keys
     * @param object
     * @returns {object}
     */
    function sortObject(object) {
        var sortedObj = {},
            keys = _.keys(object);

        keys = _.sortBy(keys, function (key) {
            return key;
        });

        _.each(keys, function (key) {
            sortedObj[key] = object[key];
        });

        return sortedObj;
    }

    /**
     * Removes all unwanted inherited values and generated model from remote items
     * So they can be compared with clean local model
     * @param {object} item
     * @returns {object} new cleaned item
     */
    function sanitizeItem(item) {

        // Only for templates, but not validating item type here
        var fieldWhitelist = ['name',
            'contextItemName',
            'parentItemName',
            'extendedItemName',
            'properties',
            'tags',
            'type'
        ];

        for (var field in item) {
            if (!_.contains(fieldWhitelist, field)) {
                delete item[field];
            }
        }

        //Remote items remove the [] from the extended items name,
        // so we will remove the local ones to match
        if (item.extendedItemName) {
            //As the remote item has removed its brackets we will follow :(
            //TODO: Raise with CXP team
            item.extendedItemName = item.extendedItemName.replace(/\[|\]/g, '');
            //if (item.contextItemName !== '[BBHOST]' && item.tags) {
            if (item.tags) {
                //TODO: Check tags inheritance and raise with CXP team
                //As the remote item is showing inherited tags, with no way if knowing if
                // these are owned or inherited we will assume extended items can't
                // own tags and remove them
                delete item.tags;
            }
        }

        if (item.tags && item.tags.tag) {
            if (item.tags.tag.length > 0) {
                _.forEach(item.tags.tag, function (tag) {
                    //Remote items in 5.6 have blacklist set to false by default
                    //if (!tag.$blacklist) {
                    //tag['$blacklist'] = 'false';
                    //}
                    delete tag.$manageable;
                });
            } else {
                delete item.tags;
            }
        } else if (item.tags) {
            delete item.tags;
        }

        if (item.properties && item.properties.property) {
            if (item.properties.property.length > 0) {
                var removeInheritedProperties = {};

                _.forEach(item.properties.property, function (property) {
                    //TODO: templates don't return $itemName attr, another small inconsistency
                    if ((property.$itemName && property.$itemName === item.name) || item.type) {
                        delete property.$readonly;
                        delete property.$manageable;
                        delete property.$itemName;

                        //TODO: property type values are auto generated differently and stored as
                        //      Title case, we will make them all lowercase
                        property.value.$type = property.value.$type.toLowerCase();

                    } else if (property.$itemName) {
                        removeInheritedProperties[property.$name] = true;
                    }
                });

                //when reading rest remove inherited values so matches local version
                _.remove(item.properties.property, function (value) {
                    return removeInheritedProperties[value.$name] ? true : false;
                });
            } else {
                delete item.properties;
            }
        } else if (item.properties) {
            delete item.properties;
        }

        return item;
    }

    /**
     * Gets an array with objects that didn't have a match in another array of ojbects
     * @param {array} getUnmatchedInArray - array of properties or tags or objects
     * @param {array} matchWithArray - array of properties or tags or objects for comparison
     * @returns {array} All objects unmatched in first array when compared with second
     */
    function getUnmatchedObjectsInArray(getUnmatchedInArray, matchWithArray) {
        var clonedObjects = _.cloneDeep(getUnmatchedInArray);
        return clonedObjects.filter(function (lObject) {
            var matchedObjects = matchWithArray.filter(function (rObject) {
                return _.isEqual(lObject, rObject);
            });
            return matchedObjects.length === 0;
        });
    }

    /**
     * Compares and returns the item with the delta differences that will be sent to
     *   the remote model for properties and tags only
     * @param {object} localItem
     * @param {object} remoteItem
     * @returns {object}
     */
    function revealDifferences(localItem, remoteItem) {
        var localItemChangesOnly,
            newLocalProperties,
            redundantRemoteProperties,
            filteredRedundantProperties,
            newLocalTags,
            redundantRemoteTags,
            arrayDiffMessageLog;

        //clone item to keep original in tact
        localItemChangesOnly = _.cloneDeep(localItem);

        //Remove all properties/tags as we will only put back the delta
        if (!localItemChangesOnly.properties) {
            localItemChangesOnly.properties = {property: []};
        }

        if (!localItemChangesOnly.tags) {
            localItemChangesOnly.tags = {tag: []};
        }


        //for item without properties add an empty array so the diff works nicely
        if (!localItem.properties || !localItem.properties.property) {
            localItem.properties = {property: []};
        }

        if (!remoteItem.properties || !remoteItem.properties.property) {
            remoteItem.properties = {property: []};
        }

        //All the local properties that are not 100% matched with remote (or other source)
        newLocalProperties = getUnmatchedObjectsInArray(localItem.properties.property, remoteItem.properties.property);

        //All remote values that are not matched with new model, this will include any changed property with different label,viewhint etc
        redundantRemoteProperties = getUnmatchedObjectsInArray(remoteItem.properties.property, localItem.properties.property);

        //Default is to remove all properties from redundant list if we have values locally with same name,
        // if cleanup = true - we don't want to delete these just update from local only (default)
        // if cleanup = false - we will skip removing remote properties
        if (!_cliOpts.cleanup || _cliOpts.cleanup === true) {
            filteredRedundantProperties = redundantRemoteProperties.filter(function (lObject) {
                var matchedObjectsByName = newLocalProperties.filter(function (rObject) {
                    return lObject.$name === rObject.$name;
                });
                return matchedObjectsByName.length === 0;
            });

            _.forEach(filteredRedundantProperties, function (property) {
                console.log('removing', remoteItem.name, 'property', property.$name);
                property.$markedForDeletion = 'true';
                localItemChangesOnly.properties.property.push(property);
            });
        }

        localItemChangesOnly.properties.property.concat(newLocalProperties);


        if (!_cliOpts.cleanup || _cliOpts.cleanup === true) {

            if (localItem.tags && localItem.tags.tag && remoteItem.tags && remoteItem.tags.tag) {
                newLocalTags = getUnmatchedObjectsInArray(localItem.tags.tag, remoteItem.tags.tag);
                redundantRemoteTags = getUnmatchedObjectsInArray(remoteItem.tags.tag, localItem.tags.tag);

                localItemChangesOnly.tags.tag = newLocalTags;

                _.forEach(redundantRemoteTags, function (tag) {
                    tag.$blacklist = 'true';
                    localItemChangesOnly.tags.tag.push(tag);
                });
            } else if (localItem.tags && localItem.tags.tag) {
                localItemChangesOnly.tags.tag = localItem.tags.tag;
            }
        }


        if (_cliOpts.verbose) {
            arrayDiffMessageLog = [];
            recLooper(localItemChangesOnly, arrayDiffMessageLog);

            console.log('localItemChangesOnly', arrayDiffMessageLog);
        }

        return localItemChangesOnly;
    }

    /**
     * Takes wrapped item object and creates a XHR GET request to find remote version
     * if found we find the deference and add it to the PUT array, if its not on the remote
     * server we add the item to the POST Array.
     * @param {object} localItemPackage
     * @returns {promise}
     */
    function get(localItemPackage) {
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
                    myRemoteItemData.statusCode === 200) ||
                    myRemoteItemData.statusCode === 404) {

                    console.log(myRemoteItemData.statusCode, 'adding to post queue', localItem.name);

                    //if the doesn't exist post for first time
                    queues.postQueue.push(localItemPackage);

                } else if (!myRemoteItemData.error && myRemoteItemData.statusCode === 200) {
                    //so we should compare for deference before putting
                    console.log('Get Successful.. 200, comparing', localItem.name);

                    var remoteItemPackage = jxon.stringToJs(_.unescape(myRemoteItemData.body));

                    var putPackage = getDifferences(localItemPackage, remoteItemPackage);

                    if (putPackage) {
                        queues.putQueue.push(putPackage);
                    }
                } else if (myRemoteItemData.statusCode === 302) {
                    console.log('Get.. 302 ', myRemoteItemData.body);
                } else {
                    console.log('get default', myRemoteItemData.statusCode, localItem.name);
                    //console.log('got data, ',  jxon.stringToJs(_.unescape(myRemoteItemData.body)));
                }

            }).fail(function (e) {
                console.log('pre-get fail: ', e);
                console.log(e.stack);
            });
    }

    //TODO: remove this if its never used
    /**
     * Flattens all objects values into array of strings with paths
     * @param object
     * @param array
     * @param messageChain
     */
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
        });
    };

};

if (!module.parent) {
    startImport(process.argv[2]);
}
