module.exports = function(bbscaff){
    bbscaff.prompt([
        {
            name: 'container_title',
            message: 'Container title'
        },
        {
            name: 'render_type',
            message: 'Render type',
            choices: ['csr', 'ssr'],
            default: 'ssr'
        },
        {
            name: 'container_name',
            message: 'Container name',
            'default': function(answers){
                return answers.container_title.replace(/\s+/gi, '-').toLowerCase();
            },
            validate: function(string){
                return string.length > 1;
            }
        },
        {
            name: 'template_name',
            message: 'Template name',
            filter: function(string){
                return bbscaff.toCamelCase(string);
            },
            validate: function(string){
                return string.length > 1;
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