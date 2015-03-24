var request = require('request');
var util = require('../lib/util');
var _ = require('lodash');
var mvnCredentials = require('mvn-credentials');
var inquirer = require('inquirer');
var parseString = require('xml2js').parseString;

var credentials = mvnCredentials.fetch();


exports.get = function(callback) {

    // Get the initial list of archetypes from https://repo.backbase.com/expert-release-local/com/backbase/expert/tools
    request({
        auth: {
          'user': credentials.username,
          'pass': credentials.password
        },
        url: "https://repo.backbase.com/api/storage/expert-release-local/com/backbase/expert/tools"
        // url: "https://repo.backbase.com/api/search/pattern?pattern=expert-release-local:com/backbase/expert/tools/*\/maven-metadata.xml" //@TODO: Requires Pro version > check with ICT
    }, function(err, res, body) {

      if(err) return util.err(err);

      filterArchetypes(body, function(archsList) {

        var cleanedUpList = [];
        archsList.forEach(function(item, i) {
          if(archsList.length === (i +1)) {
            cleanedUpList.push(new inquirer.Separator());
          } else {
            cleanedUpList.push(item.substr(1));
          }
        });
        if(callback && typeof(callback) === "function") callback(cleanedUpList);
      });

    });

};

exports.getVersions = function(selectedArchetype, callback) {

  request({
      auth: {
        'user': credentials.username,
        'pass': credentials.password
      },
      url: "https://repo.backbase.com/expert-release-local/com/backbase/expert/tools/" + selectedArchetype + "/maven-metadata.xml"
      // url: "https://repo.backbase.com/api/search/pattern?pattern=expert-release-local:com/backbase/expert/tools/*/maven-metadata.xml" //@TODO Requires Pro version > check with ICT
  }, function(err, res, body) {

    if(err) return util.err(err);

    parseString(body, {explicitArray: false}, function (err, xmlJson) {
      var archetypeVersions;
      var latestVersions = xmlJson.metadata.versioning.versions.version;

      if(latestVersions instanceof Array) {
          archetypeVersions = latestVersions;
      } else {
          archetypeVersions = [latestVersions];
      }

      if(callback && typeof(callback) === "function") callback(archetypeVersions);
    });

  });
};

// filter the archetypes that have a file `maven-metadata.xml`
var filterArchetypes = function(repos, callback) {
  var archetypesUrlList = [];

    var archetypesList = JSON.parse(repos);

    archetypesList.children.forEach(function(archetype) {
      // Filter out the `backbase-` prepended
      if(archetype.uri.substring(0,10) === "/backbase-" && archetype.uri.indexOf(".") === -1) {
        // Push the URL to an array
        archetypesUrlList.push(archetype.uri);
      }
    });

    if(callback && typeof(callback) === "function") callback(archetypesUrlList);

};
