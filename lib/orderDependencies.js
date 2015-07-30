var bower = require('bower');
var _ = require('lodash');
var Q = require('q');

var dir = '/Users/ben/Sites/backbase/launchpad/misc/launchpad-portal-dev/backbase.home/collection-launchpad';

module.exports = function(dir) {
    var defer = Q.defer();

    console.log('bower list...');
    bower.commands.list([], {cwd: dir}).on('end', function(results) {
        console.log('ordering dependencies...');
        // Convert the tree to a flat structure, then pass the values to ordering function.
        var depsOrdered = (orderDeps(_.values(treeToFlat(results)), results));

        var names = _.pluck(depsOrdered, 'pkgMeta.name');

        defer.resolve(names);
    });
    return defer.promise;
};

// Convert the tree to flat structure.
function treeToFlat(results) {
    var flat = {};

    _.forEach(results.dependencies, function(value, key) {
        flat[value.pkgMeta.name] = value;
        flat = _.merge(flat, treeToFlat(value));
    });

    return flat;
}

// Order the flat list of deps.
function orderDeps(flatList, treeList) {
    return flatList.sort(function(dep1, dep2) {
        // Check if dependency1 depends on dependency2 (recursive).
        return (isDependingOn(treeList, dep1, dep2)) ? 1 : -1;
    });
}

// Recursively checks if dep1 depends on dep2.
function isDependingOn(dependencyTree, dep1, dep2) {
    // If dep1 has dep2 as a direct dependency.
    if (_.has(dep1.dependencies, dep2.pkgMeta.name)) {
        return true;
    }

    // Check if dep2's dependencies list dep1.
    return _.reduce(
            _.values(dep1.dependencies),
            function(isDep, checkDep) {
                return isDep || isDependingOn(dependencyTree, checkDep, dep2);
            },
            false
    );
}


