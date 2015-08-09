var _ = require('lodash');
//var glob = require('glob');
//var jxon = require('jxon');
//var chalk = require('chalk');
//var config = require('../config');
//var util = require('../util');
//var Q = require('q');
//var path = require('path');

(function () {
    var model = {};

    var config = {
        catalogTags: ['catalog', 'portalPages','portalContainers','portalWidgets', 'serverContainers', 'serverWidgets'],
        serverTags:  ['catalog', 'portalPages','portalContainers','portalWidgets', 'serverContainers', 'serverWidgets',
            'portals','templates']
    };

    //exports.diff = model.diff = function (localItem, remoteItem) {
    //
    //
    //    return '';
    //};


    exports.sort = model.sort = function (array, property, property2) {

        var getWrapper = function(item) {
            for (var wrapper in item) {
                return wrapper;
            }
        };

        var removeWrappers = function(item) {
            for (var wrapper in item) {
                for (var inner in item[wrapper]) {
                    return item[wrapper][inner];
                }
            }
        };

        var sortbyProperties = function  (array, property, property2) {

            var lookupItems = _.reduce(array, function (result, item) {
                item = removeWrappers(item);
                result[item.name] = item[property];
                return result;
            }, {});


            var lookupItems2 = {};
            if (property2) {
                lookupItems2 = _.reduce(array, function (result, item) {
                    item = removeWrappers(item);
                    result[item.name] = item[property2];
                    return result;
                }, {});
            }


            var depth = function (lookupItems, name) {
                if (!lookupItems[name]) {
                    return 1;
                } else {
                    return depth(lookupItems, lookupItems[name]) + 1;
                }
            };

            try {
                return array.sort(function (a, b) {
                    var da, db, da2, db2;

                    a = removeWrappers(a);
                    b = removeWrappers(b);

                    if (property2) {
                        da = depth(lookupItems, a.name);
                        db = depth(lookupItems, b.name);

                        da2 = depth(lookupItems2, a.name);
                        db2 = depth(lookupItems2, b.name);


                        return da < db ? -1 : da > db ? 1 : da2 < db2 ? -1 : da2 > db2 ? 1 : 0;
                    } else {
                        da = depth(lookupItems, a.name);
                        db = depth(lookupItems, b.name);
                        return da < db ? -1 : da > db ? 1 : 0;
                    }

                });
            } catch (err) {
                console.log('check for json error or recursive references.', err);
            }
        };

        //Simply sorting won't work because the manageable areas parent is a fake value of the pages not it immediate parent
        // So we split them server/master-pages/catalog item are sorted first, then instances.
        var arrays = _.partition(array, function (item) {
            var type = getWrapper(item);
            return config.serverTags.indexOf(type) !== -1;
        });

        return sortbyProperties(arrays[0], property, property2).concat(sortbyProperties(arrays[1], property, property2));
    };

    exports.scaffold = model.scaffold = function () {
        return {
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
        };
    };


    var addtoModel = function (model, item, type, subType) {
        var jxonPackage = {},
            target;

        //Sort catalog in to sub types
        if (config.catalogTags.indexOf(type) !== -1) {
            target = model['catalog'][subType];

            jxonPackage['catalog'] = {};
            jxonPackage['catalog'][subType] = item;

        }
        // remove items wrapper from object
        else if (type === 'items') {
            target = model[subType];

            type = subType;
            subType = subType.substring(0, subType.length - 1);

            jxonPackage[type] = {};
            jxonPackage[type][subType] = item[subType];
        } else {
            target = model[type];

            jxonPackage[type] = {};
            jxonPackage[type][subType] = item;
        }

        if (_.isArray(target)) target.push(jxonPackage);
    };

    //Assumes all items use unique names and combines into one object
    exports.addJXONtoModel = function (aJXON) {
        var oModel = _.cloneDeep(model.scaffold ());

        try {
            aJXON.filter(function (oJxon) {

                for (var root in oJxon) {
                    for (var child in oJxon[root]) {
                        //If you have more than on widget/item in your xml file it'll be an array
                        if (_.isArray(oJxon[root][child])) {
                            _.forEach(oJxon[root][child], function(item) {
                                addtoModel(oModel, item, root, child);
                            });
                        } else if (_.isObject(oJxon[root][child])) {
                            addtoModel(oModel, oJxon[root][child], root, child);
                        }
                    }
                }
            });

            return oModel;

        } catch (error) {
            console.log(chalk.bgRed('Error merging items into single object:'), error);
            process.exit(1);
        }
    };



    if (!module.parent) {
        model.sort(process.argv[2]);
    }
})();
