var _ = require('lodash');
var topsort = require('topsort');

// a - collection of jxon items
module.exports = function(a) {
    var order = [];
    var newa = [];
    var minuses = [];
    var parent, parentIndex;
    _.each(a, function(item, itemIndex) {
        parent = _.find(a, {name: item.parentItemName}) || _.find(a, {name: item.extendedItemName});
        parentIndex = a.indexOf(parent);
        if (parentIndex === -1) minuses.push(itemIndex);
        else order.push([parentIndex, itemIndex]);
    });
    order = topsort(order);
    _.each(minuses, function(val, ind) {
        if (order.indexOf(val) === -1) order.push(val);
    });
    _.each(order, function(val) {
        newa.push(a[val]);
    });
    return newa;
    // check(newa);
};

function check(a) {
    _.each(a, function(item, itemIndex) {
        var parent = _.find(a, {name: item.parentItemName});
        if (!parent) parent = _.find(a, {name: item.extendedItemName});
        var parentIndex = a.indexOf(parent);
        console.log(itemIndex, parentIndex, parentIndex < itemIndex, item.name, parent? parent.name : -1);
    });
}
