var checkGithubConnectivity = require('../../lib/checkGithubConnectivity');

console.log('This widget is not compatible with CXP 5.6');

module.exports = function(bbscaff){
    bbscaff.prompt([
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
        },{
            name: 'sectionTag',
            message: 'Section tag'
        },
        {
            name: 'tags',
            message: 'Regular tags',
            filter: function(str){
                return str.split(/\s*,\s*/);
            }
        }
    ], function(answers){
        checkGithubConnectivity('https://bitbucket.org/backbase/lpg-generator-widget-ng-lite.git')
            .then(
                function (repoUrl) {
                    bbscaff.fetchTemplate(repoUrl, __dirname, function(err){
                        if (err) {
                            return console.error('Error trying to update template from git', err);
                        }
                        bbscaff.generate(answers, answers.widget_name);
                    });
                },
                function (err) {
                    bbscaff.generate(answers, answers.widget_name);
                }
            );

    });
};
