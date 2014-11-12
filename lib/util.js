var chalk = require('chalk');

exports.backbase = function(){
	console.log(chalk.gray([" ____             _    _                     ", "| __ )  __ _  ___| | _| |__   __ _ ___  ___  ", "|  _ \\ / _` |/ __| |/ / '_ \\ / _` / __|/ _ \\ ", "| |_) | (_| | (__|   <| |_) | (_| \\__ \\  __/ ", "|____/ \\__,_|\\___|_|\\_\\_.__/ \\__,_|___/\\___| "].join('\n') + '\n'))
}

exports.ok = function(){
	var args = Array.prototype.slice.call(arguments);
		args[1] = chalk.gray(args[1])
		args.unshift(chalk.green('✓'))
		console.log.apply(this, args)
}

exports.err = function(msg){
	var args = Array.prototype.slice.call(arguments);
		args[1] = chalk.gray(args[1])
		args.unshift(chalk.red('✖'))
		console.log.apply(this, args)
}

