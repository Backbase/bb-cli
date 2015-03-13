var Command = require('ronin').Command;
var spawn = require('cross-spawn').spawn;
var inquirer = require('inquirer');
var util = require('../lib/util');
var archetypes = require('../lib/archetypes');

var answerCollection = {};

var chooseArchetypeName = function(callback) {
  archetypes.get(function(esArchetypesNames) {
    var options = {
      type: "list",
      name: "archetypeName",
      message: "Choose the archetype you wish to install:",
      choices: esArchetypesNames
    };

    inquirer.prompt(options, function(answer) {
      // Get version numbers of chosen archetype
      if(callback && typeof(callback) === "function") callback(answer.archetypeName);
    });
  });
};

var chooseArchetypeVersion = function(arrayVersions, callback) {
  archetypes.getVersions(arrayVersions, function(archetypeVersions) {
    var optionsVersions = {
      type: "list",
      name: "archetypeVersion",
      message: "Which version do you want to install?",
      choices: archetypeVersions
    };
    inquirer.prompt(optionsVersions, function(answerVersion) {
        if(callback && typeof(callback) === "function") callback(answerVersion.archetypeVersion);
    });
  });
};

var runCmd = function(cmd, args, callback) {

  var child = spawn(cmd, args, {stdio: 'inherit'});

  child.on('close', function() {
      if(callback && typeof(callback) === "function") callback();
  });

  child.on('error', function(err) {
      if(err) util.err(err);
  });

};

var confirmAnswers = function() {
  inquirer.prompt({
    type: "confirm",
    name: "archetypeConfirm",
    message: "Is the above information correct?",
    default: true
  }, function(answerConfirm) {
    if(answerConfirm.archetypeConfirm === true) {

      console.info("Initiating 'mvn archetype' command...");
      var cmdOptions = [
        "archetype:generate",
        "-DarchetypeArtifactId=" + answerCollection.name,
        "-DarchetypeGroupId=com.backbase.expert.tools",
        "-DarchetypeVersion=" + answerCollection.version
      ];
      runCmd("mvn", cmdOptions, function() {
        console.info("> Process successfully executed.\n");
      });

    } else {
        console.info("> Please restart the process and select the desired options.\n");
    }

  });
};

var init = function(){

  chooseArchetypeName(function(resName) {
    answerCollection.name = resName;
    chooseArchetypeVersion(resName, function(resVersion) {
      answerCollection.version = resVersion;
      confirmAnswers();
    });
  });

};

var Archetype = Command.extend({
    desc: 'Easily check out an existing Archetype. Select from a list of available archetypes and versions.',
    run: init
});

module.exports = Archetype;
