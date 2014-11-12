var chalk = require('chalk');

exports.backbase = function(){
	console.log(chalk.gray([" ____             _    _                     ", "| __ )  __ _  ___| | _| |__   __ _ ___  ___  ", "|  _ \\ / _` |/ __| |/ / '_ \\ / _` / __|/ _ \\ ", "| |_) | (_| | (__|   <| |_) | (_| \\__ \\  __/ ", "|____/ \\__,_|\\___|_|\\_\\_.__/ \\__,_|___/\\___| "].join('\n') + '\n'))
}

exports.ok = function(msg){
	console.log(chalk.green('✓') + ' ' + msg)
}

exports.err = function(msg){
	console.log(chalk.red('✖') + ' ' + msg)
}

