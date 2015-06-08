module.exports = function(bbscaff) {
    bbscaff.prompt([
        {
            name: 'module_title',
            message: 'Module title'
        },
        {
            name: 'module_name',
            message: 'Module name',
            'default': function(answers) {
                return answers.module_title.replace(/ /gi, '-').toLowerCase();
            }
        },
        {
            name: 'module_author',
            message: 'Module author',
            'default': 'Backbase <practices@backbase.com>'
        },
        {
            name: 'module_version',
            message: 'Module version',
            'default': '1.0.0'
        },
        {
            name: 'module_description',
            message: 'Module description',
            'default': 'A fine launchpad 12 module.'
        },
        {
            name: 'bundle_name',
            message: 'Bundle name',
            'default': bbscaff.getCurrentBundle()
        },
        {
            name: 'bundle_prefix',
            message: 'Bundle prefix',
            'default': bbscaff.getPrefix(bbscaff.getCurrentBundle())
        }
    ], function(answers){
        bbscaff.generate(answers, answers.module_name);
    });
};
