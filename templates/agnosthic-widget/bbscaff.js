var updateTemplatesOnDemand = require('../../lib/updateTemplatesOnDemand');
var repos = require('../repos.json');

module.exports = function (bbscaff) {
    var generate = function (answers) {
        bbscaff.generate({
            widget: answers
        }, {
            // Sets destination path
            destination_path: answers.name,
            // Reset interpolate from bbscaff, so instead of <%=var%> it uses ${var}
            interpolate: undefined
        });
    };

    bbscaff
        .prompt([
            {
                type: 'input',
                name: 'namespace',
                message: 'Namespace'
            },
            {
                type: 'input',
                name: 'name',
                message: 'Name'
            }, {
                type: 'input',
                name: 'description',
                message: 'Description'
            }, {
                type: 'input',
                name: 'version',
                message: 'Version',
                default: '1.0.0'
            }, {
                type: 'input',
                name: 'author',
                message: 'Author'
            }, {
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
            updateTemplatesOnDemand(repos['agnosthic-widget'], __dirname)
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
