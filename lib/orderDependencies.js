var bower = require('bower');
var _ = require('lodash');
var Q = require('q');

module.exports = function(dir) {
    var defer = Q.defer();

    bower.commands.list([], {cwd: dir}).on('end', function(results) {
        // Convert nested deps to flat.
        var flat = _.values(treeToFlat(results));

        // For each component, group the dependencies together.
        var groupedDeps = groupDeps(flat);

        // Push deps into ordered list.
        var ordered = [];
        _.forEach(groupedDeps, function(deps, key) {
            pushDep(key, groupedDeps, ordered);
        });

        defer.resolve(ordered);
    });
    return defer.promise;
};

// Recursively push dependencies to ordered list.
// For each dependency, first make sure the sub-dependencies are pushed.
function pushDep(name, groupedDeps, ordered) {
    // If already pushed, skip.
    if (ordered.indexOf(name) >= 0) {
        return;
    }

    var deps = groupedDeps[name];
    // Get list of deps (that haven't already been pushed).
    var pushFirst = (_.difference(deps, ordered));
    pushFirst.forEach(function(beforeName) {
        pushDep(beforeName, groupedDeps, ordered);
    });

    ordered.push(name);
}

// Convert the tree to flat structure.
function treeToFlat(results) {
    var flat = {};

    _.forEach(results.dependencies, function(value) {
        flat[value.pkgMeta.name] = value;
        flat = _.merge(flat, treeToFlat(value));
    });

    return flat;
}

function groupDeps(flatDeps) {
    var tree = {};
    flatDeps.forEach(function(dep) {
        tree[dep.pkgMeta.name] = flattenDeps(dep.dependencies);
    });

    return tree;
}

function flattenDeps(deps) {
    var flatDeps = [];
    _.forEach(deps, function(dep) {
        flatDeps.push(dep.pkgMeta.name);
        flatDeps = _.union(flatDeps, flattenDeps(dep.dependencies));
    });

    return flatDeps;
}

