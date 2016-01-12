var updateTemplatesOnDemand = require('../../lib/updateTemplatesOnDemand');
var repos = require('../repos.json');

console.log('This widget could be not compatible with CXP 5.6');

module.exports = function (bbscaff) {
    var generate = function (answers) {
        bbscaff.generate(answers, answers.widget_name);
    };

    bbscaff
        .prompt([
            {
                type: 'input',
                name: 'widget_name',
                message: 'Name'
            }, {
                type: 'input',
                name: 'widget_description',
                message: 'Description'
            }, {
                type: 'input',
                name: 'widget_version',
                message: 'Version',
                default: '1.0.0'
            }, {
                type: 'input',
                name: 'widget_author',
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
