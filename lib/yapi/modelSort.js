var _ = require('lodash');

//Sorting assumes default Api structure as follows:
//{
//    templates: {},
//    portals: {},
//    catalog: {},
//    pages: {},
//    containers: {},
//    widgets: {},
//    links: {},
//    groups: {},
//    users: {},
//    rightsList: {},
//    advancedrights: {}
//}

(function () {
    var modelSort = {};
    exports.modelSort = modelSort.startSort = function (model) {

        //looping through all defined item groups
        for (var itemType in model) {
            //We want to sort catalog items into sub type for w,c,p with the catalog
            if (itemType === 'catalog') {
                for (var childType in model[itemType]) {
                    model[itemType][childType] = sortItemsByProperty(model[itemType][childType], 'parentItemName', 'extendedItemName');
                }
            } else {
                model[itemType] = sortItemsByProperty(model[itemType], 'parentItemName', 'extendedItemName');
            }
        }

        return model;
    };

    var removeWrappers = function(item) {
        for (var wrapper in item) {
            for (var inner in item[wrapper]) {
                return item[wrapper][inner];
            }
        }
    };

    var sortItemsByProperty = function (array, property, property2) {


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


    if (!module.parent) {
        modelSort.startSort(process.argv[2]);
    }
})();
