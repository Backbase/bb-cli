
var chalk = require('chalk');
var Command = require('ronin').Command;
var bbGenerate = require('@bb-cli/bb-generate');
var _ = require('lodash');
var partialRight = _.partialRight;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' <template-name>';
        r += '\n\t Scaffold widgets and containers.\n';
        r += '\n\t Generators must be installed first from separate packages.\n';
        r += '\t For a list of possible generators see https://www.npmjs.com/~bb-cli.\n';
        r += '\n  ' + title('Install a generator') + ':\n';
        r += '      npm install @bb-cli/generator-widget\n';
        r += '      npm install @bb-cli/generator-container\n';
        r += '\n  ' + title('List installed generators') + ':\n';
        r += '      bb generate\n';
        r += '\n  ' + title('Run a generator') + ':\n';
        r += '      bb generate widget\n';
        r += '      bb generate container';
        return r;
    },

    run: function(name){
        if (!name) {
            return list()
                .catch(handleError);
        } else {
            console.log(chalk.gray('Generating ' + name + ' on path: ' + process.cwd()));
            return generate(name)
                .then(function(generator) {
                    console.log('Generated succesfully in directory: ' + generator.target);
                })
                .catch(handleError);
        }
    }
});

function list(asJson) {
    return bbGenerate.listGenerators()
        .then(output);
}

function output(generators) {
    console.log(chalk.green('Available templates:'));
    console.log(bbGenerate.cliTable(generators));
}

function handleError(err) {
    console.log(err);
    if (err.stack) {
        console.log(err.stack);
    }
    process.exit(1);
}

var handleNotFound = _.curry(function(name, generator) {
    if (!generator || !generator.name) {
        throw 'Generator not found: ' + name + '.\nMake sure you instal it with ' +
                '"npm install -g bb-generator-' + name + '"';
    }
    return generator;
});

function generate(name, target, processImages, standalone) {
    var options = {
        processImages: processImages,
        standalone: standalone,
        target: target
    };

    // pass options (creates new fn to accept just the generator).
    var generate = partialRight(bbGenerate.generate, options);
    var prompt = partialRight(bbGenerate.promptGeneratorQuestions, options);
    return bbGenerate.findGeneratorByName(name)
        .then(handleNotFound(name))
        .then(prompt)
        .then(generate);
}
