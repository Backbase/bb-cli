var Q = require('q');
var inquirer = require("inquirer");
var _ = require('lodash');

// prompts user to choose portal and it returns the promise resolved with portals name
module.exports = function(bbrest, jxon) {
    return bbrest.server().get()
    .then(function(v) {
        v = jxon.stringToJs(_.unescape(v.body));

        if (v.portals.portal instanceof Array) {
            var portals = _.pluck(v.portals.portal, 'name');
            var defer = Q.defer();
            inquirer.prompt([{
                message: 'Choose the portal to target',
                name: 'name',
                type: 'list',
                choices: portals
            }], function (answers) {
                defer.resolve(answers.name);
            });
            return defer.promise;
        }
        return Q(v.portals.portal.name);

    });
};
