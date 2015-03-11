var Command = require('ronin').Command;
var Bbscaff = require('../lib/bbscaff');
var path = require('path');

var init = function(){
    var templatesDir = path.join(__dirname, '..', 'templates');

    require(path.join(templatesDir, 'init', 'bbscaff'))(new Bbscaff(path.join(templatesDir, 'init', 'template')));
};

var Init = Command.extend({
    desc: 'Project setup configuration (generates bower.json, .bowerrc ant other)',

    run: init
});

module.exports = Init;
