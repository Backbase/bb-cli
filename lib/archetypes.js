var request = require('request'),
    util = require('../lib/util'),
    _ = require('lodash'),
    mvnCredentials = require('mvn-credentials'),
    inquirer = require('inquirer'),
    parseString = require('xml2js').parseString;

var credentials = mvnCredentials.fetch();


var get = exports.get = function(callback) {

    // Get the initial list of archetypes from https://repo.backbase.com/expert-release-local/com/backbase/expert/tools
    request({
        auth: {
          'user': credentials.username,
          'pass': credentials.password
        },
        url: "https://repo.backbase.com/api/storage/expert-release-local/com/backbase/expert/tools"
        // url: "https://repo.backbase.com/api/search/pattern?pattern=expert-release-local:com/backbase/expert/tools/*\/maven-metadata.xml" //Requires Pro version > check with ICT
    }, function(err, res, body) {

      if(err) return util.err(err);

      filterArchetypes(body, function(archsList) {

        var cleanedUpList = [];
        var archsListNames = _.forEach(archsList, function(item, i) {
          if(archsList.length === (i +1)) {
            cleanedUpList.push(new inquirer.Separator());
          } else {
            cleanedUpList.push(item.substr(1));
          }
        });
        if(callback) callback(cleanedUpList);
      });

    });

    // if(callback) callback(["backbase-all-in-one-archetype","backbase-all-in-one-launchpad-archetype","backbase-contentservices-archetype","backbase-es-project-archetype","backbase-launchpad-archetype","backbase-mashupservices-archetype","backbase-orchestrator-archetype","backbase-parent-archetype","backbase-portal-archetype-all-in-one","backbase-portal-archetype-all-in-one-launchpad","backbase-portal-archetype-basic","backbase-portalserver-archetype","backbase-services-archetype"]);


};

var getVersions = exports.getVersions = function(selectedArchetype, callback) {

  request({
      auth: {
        'user': credentials.username,
        'pass': credentials.password
      },
      url: "https://repo.backbase.com/expert-release-local/com/backbase/expert/tools/" + selectedArchetype + "/maven-metadata.xml"
      // url: "https://repo.backbase.com/api/search/pattern?pattern=expert-release-local:com/backbase/expert/tools/*/maven-metadata.xml" //Requires Pro version > check with ICT
  }, function(err, res, body) {

    if(err) return util.err(err);

    parseString(body, {explicitArray: false}, function (err, xmlJson) {
      var recentVersions = [xmlJson.metadata.versioning.latest];
      _.forEach(xmlJson.metadata.versioning.versions.version, function(recentVersion) {
        recentVersions.push(recentVersion);
      });
      var archetypeVersions = _.uniq(recentVersions);
      if(callback) callback(archetypeVersions);
    });

  });
};

// filter the archetypes that have a file `maven-metadata.xml`
var filterArchetypes = function(repos, callback) {
  var archetypesUrlList = [];

    archetypesList = JSON.parse(repos);

    _.forEach(archetypesList.children, function(archetype, index) {
    //   // Filter out the `backbase-` prepended
      if(archetype.uri.substring(0,10) === "/backbase-" && archetype.uri.indexOf(".") === -1) {
        // Push the URL to an array
        archetypesUrlList.push(archetype.uri);
      }
    });

    if(callback) callback(archetypesUrlList);

};
