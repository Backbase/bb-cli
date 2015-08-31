var _ = require('lodash');

module.exports = function(groupedDeps) {
    var ordered = [];
    _.forEach(groupedDeps, function(deps, key) {
        pushDep(key, groupedDeps, ordered);
    });
    return ordered;
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

