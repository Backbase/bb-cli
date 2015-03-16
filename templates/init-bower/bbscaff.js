var fs = require('fs');
var path = require('path');
var chalk = require('chalk');

module.exports = function (bbscaff) {
    bbscaff.prompt([
        {
            name: 'backbaseProject',
            message: 'Project name',
            default: 'backbase-project'
        },
        {
            name: 'componentsDirectory',
            message: 'Components directory',
            default: 'portalserver/src/main/webapp/static/bower_components'
        },
        {
            name: 'componentsWebUrl',
            message: 'Components root static web URL',
            default: 'portalserver/static/bower_components'
        },
        {
            name: 'requireConfPaths',
            message: 'Paths to existing require.js configurations (comma separated)',
            default: 'portalserver/target/launchpad.war/conf/require-conf.js',
            filter: function (answer) {
                return answer.split(',');
            }
        }
    ], function (answers) {
        bbscaff.template_dir = path.join(__dirname, 'template');

        bbscaff.generate(answers, {
            destination_path: './'
        }, function () {
            fs.rename('bowerrc.json', '.bowerrc', function (err) {
                if (err) console.log(chalk.red('Error renaming to .bowerrc: '), err);

                bbscaff.logSuccess(chalk.green('Init successful.'));
            });
        });
    });
};
