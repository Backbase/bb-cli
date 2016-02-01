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
                //if 'a b ' is matched, it will convert it to '-a-b-'
                //the container name is used in the model.xml, and for naming the js and css files
                //in the scripts and styles folder respectively
                return answers.container_title.replace(/\s+/gi, '-').toLowerCase();
            },
            validate: function (input) {
                var done = this.async();
                if(input.length === 0){
                    done('Container name is mandatory');
                    return;
                }
                done(true);
            }
        },
        {
            name: 'template_name',
            message: 'Template name',
            filter: function(string){
                return bbscaff.toCamelCase(string);
            },
            validate: function (input) {
                var done = this.async();
                if(input.length === 0){
                    done('Template name is mandatory');
                    return;
                }
                done(true);
            }
        },
        {
            name: 'sectionTag',
            message: 'Section tag'
        },
        {
            name: 'tags',
            message: 'Regular tags',
            filter: function(str){
                return str.split(/\s*,\s*/);
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
