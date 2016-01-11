var checkGithubConnectivity = require('../../lib/checkGithubConnectivity');
var repos = require("../repos.json");

module.exports = function(bbscaff){
    var generate = function (answers) {
        bbscaff.generate({
            // LP uses widget.name instead of widget_name
            module: answers
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
    ], function(answers){
        checkGithubConnectivity()
            .then(
                function (){
                    bbscaff.fetchTemplate(repos['lp-module'], __dirname, function(err){
                        if (err) {
                            return console.error('Error trying to update template from git', err);
                        }
                        generate(answers);
                    });
                },
                function (err) {
                    generate(answers);
                }
            );
    });
};
