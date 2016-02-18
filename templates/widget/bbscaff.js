var updateTemplatesOnDemand = require('../../lib/updateTemplatesOnDemand');
var repos = require('../repos.json');

console.log('This widget could be not compatible with CXP 5.6');

module.exports = function (bbscaff) {
    var generate = function (answers) {
        answers = {
            widget: answers
        };
        bbscaff.generate(
            answers,
            {
                // Sets destination path
                destination_path: answers.widget.name,
                // Reset interpolate from bbscaff, so instead of <%=var%> it uses ${var}
                interpolate: undefined
            });
    };

    bbscaff
        .prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Name',
                validate: function (input) {
                    var done = this.async();
                    if (input.length === 0) {
                        done('Name is mandatory');
                        return;
                    }
                    done(true);
                }
            },
            {
                type: 'input',
                name: 'description',
                message: 'Description',
                validate: function (input) {
                    var done = this.async();
                    if (input.length === 0) {
                        done('Description is mandatory');
                        return;
                    }
                    done(true);
                }
            },
            {
                type: 'input',
                name: 'version',
                message: 'Version',
                default: '1.0.0'
            },
            {
                type: 'input',
                name: 'author',
                message: 'Author'
            },
            {
                name: 'sectionTag',
                message: 'Section tag'
            },
            {
                name: 'tags',
                message: 'Regular tags',
                filter: function (str) {
                    return str.split(/\s*,\s*/);
                }
            }
        ])
        .then(function (answers) {
            updateTemplatesOnDemand(repos.widget, __dirname)
                .then(
                    function () {
                        generate(answers);
                    },
                    function () {
                        generate(answers);
                    }
                );
        });
};
