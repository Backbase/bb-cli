var updateTemplatesOnDemand = require('../../lib/updateTemplatesOnDemand');
var repos = require('../repos.json');

module.exports = function (bbscaff) {
    var generate = function (answers) {
        bbscaff.generate({
            // LP uses widget.name instead of widget_name
            widget: answers
        }, {
            // Sets destination path
            destination_path: answers.name,
            // Reset interpolate from bbscaff, so instead of <%=var%> it uses ${var}
            interpolate: undefined
        });
    };

    bbscaff.prompt([
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
            }
        ])
        .then(function (answers) {
            updateTemplatesOnDemand(repos['lp-widget'], __dirname)
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
