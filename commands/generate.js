
var chalk = require('chalk');
var Command = require('ronin').Command;
var bbGenerate = require('@bb-cli/generate');
var _ = require('lodash');
var partialRight = _.partialRight;

module.exports = Command.extend({
    help: function () {
        var title = chalk.bold;
        var r = '\n  ' + title('Usage') + ': bb ' + this.name + ' <template-name>';
        r += '\n\t Scaffold widgets and containers.\n';
        r += '\n  ' + title('Examples') + ':\n';
        r += '      bb generate widget\n';
        r += '      bb generate container';
        return r;
    },

    run: function(name){
        if (!name) {
            return list()
                .catch(handleError);
        }
        else {
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
    console.log(chalk.gray('Note: templates defined in your home folder overrides default ' + 
            'templates.'));

    console.log(bbGenerate.cliTable(generators));
}

function handleError(err) {
    console.log(err);
    if (err.stack) {
        console.log(err.stack);
    }
    process.exit(1);
}

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
        .then(handleNotFound)
        .then(prompt)
        .then(generate);
}

function handleNotFound(generator) {
    if (!generator || !generator.name) {
        throw 'Generator not found: ' + name;
    }
    return generator;
};
