module.exports = function(bbscaff){
	bbscaff.prompt([
		{
            name: 'template_title',
            message: 'Template title',
            validate: function (input) {
                var done = this.async();
                if(input.length === 0){
                    done('Template title is mandatory');
                    return;
                }
                done(true);
            }
        },
        {
            name: 'template_name',
            message: 'Template name',
            'default': function(answers){
                return bbscaff.toCamelCase(answers.template_title);
            },
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
            name: 'bundle_name',
            message: 'Bundle name', 'default': bbscaff.getCurrentBundle()
        },
        {
            name: 'bundle_prefix',
            message: 'Bundle prefix', 'default': bbscaff.getPrefix(bbscaff.getCurrentBundle())
        }
    ], function(answers){
        answers.template_name_dashed = answers.template_title.replace(/\s+/gi, '-').toLowerCase();
        bbscaff.generate(answers, answers.template_name_dashed);
    });
};
