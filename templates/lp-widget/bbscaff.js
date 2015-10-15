module.exports = function(bbscaff){
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
        bbscaff.fetchTemplate('ssh://git@stash.backbase.com:7999/lp/widget-ng-template.git', __dirname, function(err){
            if(err) {
                return console.error('Error trying to update template from stash', err);
            }

            bbscaff.generate({
                // LP uses widget.name instead of widget_name
                widget: answers
            }, {
                // Sets destination path
                destination_path: answers.name,
                // Reset interpolate from bbscaff, so instead of <%=var%> it uses ${var}
                interpolate: undefined
            });
        });
    });
};