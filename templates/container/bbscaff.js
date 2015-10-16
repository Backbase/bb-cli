console.log('This container is not compatible with 5.6');

module.exports = function(bbscaff){
    bbscaff.prompt([
        {
            name: 'container_title',
            message: 'Container title'
        },
        {
            name: 'container_name',
            message: 'Container name',
            'default': function(answers){
                return answers.container_title.replace(/ /gi, '-').toLowerCase();
            },

            validate: function(string){
                return string.split(/ /).length === 1
            }
        },
        {
            name: 'template_name',
            message: 'Template name',
            'default': function(answers){
                return bbscaff.toCamelCase(answers.container_name);
            },

            validate: function(string){
                return string.split(/[- \.]/).length === 1
            }
        },
        {
            name: 'bundle_name',
            message: 'Bundle name', 'default': bbscaff.getCurrentBundle()
        },

        {
            name: 'bundle_prefix',
            message: 'Bundle prefix', 'default': bbscaff.getPrefix(bbscaff.getCurrentBundle())
        }
    ], function(answers){
        bbscaff.generate(answers, answers.container_name);
    });
};