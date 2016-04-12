var fs = require('fs');
var chalk = require('chalk');
var Command = require('ronin').Command;

var help = function(){
    var title = chalk.bold;
    var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' command [OPTIONS]';
    r += '\n\t Backbase forms tools.';
    r += '\n  '+ title('Commands')+'\n\t';
    //Dinamically list commands
    var commands = fs.readdirSync(__dirname + '/forms');
    r+= commands[0].replace('.js', '');
    for (var i = 1; i < commands.length; i++){
        r+=', ' + commands[i].replace('.js', '');
    }
    r += '\n';
    return r;
};

module.exports = Command.extend({
    help: help,
    desc: 'Form tools',
    run: function () {
        console.log(help());
    }
});
