var Command = require('ronin').Command,
    spawn = require('cross-spawn').spawn,
    inquirer = require('inquirer'),
    archetypes = require('../lib/archetypes'),
    asciify = require('asciify');


var answerCollection = {};
var fontCollection = [];

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
      if(callback) callback(answer.archetypeName);
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
      if(callback) callback(answerVersion.archetypeVersion);
    });
  });
};

var runCmd = function(cmd, args, callback) {

  var child = spawn(cmd, args, {stdio: 'inherit'});

  child.on('close', function() {
    // console.log('close');
    if(callback) callback();
  });

  child.on('error', function() {
    // console.log('error');
    asciify('Game over', {color: 'red', font: 'standard'}, function(err, res) {
      console.log(res);
      // console.info("> Please restart the process and select the desired options.\n"); // Add info icon in front
    });
  });

};

var gameOver = function() {
  asciify('Game over', {color: 'red', font: 'standard'}, function(err, res) {
    console.log(res);
    console.info("> Please restart the process and select the desired options.\n"); // Add info icon in front
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
      runCmd("mvn", cmdOptions, function(text) {
        asciify('You win!', {color: 'green', font: 'standard'}, function(err, res) {
          console.log(res);
        });
      });

    } else {
      asciify('Game over', {color: 'red', font: 'standard'}, function(err, res) {
        console.log(res);
        console.info("> Please restart the process and select the desired options.\n"); // Add info icon in front
      });
    }


  });
};

var init = function(creds){

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
