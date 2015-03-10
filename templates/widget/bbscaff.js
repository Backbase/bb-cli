module.exports = function(bbscaff){
    bbscaff.prompt([
        {
            name: 'widget_title',
            message: 'Widget title'
        },
        {
            name: 'widget_name',
            message: 'Widget name',
            default: function(answers){
                return answers.widget_title.replace(/ /gi, '-').toLowerCase();
            }
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
        bbscaff.generate(answers, answers.widget_name, function(){
            bbscaff.prompt({
                name: 'add_widget',
                type: 'confirm',
                message: 'Do you want to add this widget to your Enterprise Catalog?'
            }, function(answer){
                if(answer.add_widget){

                    //Todo: Implement add widget using bbrest
                    bbscaff.logError('Not implemented');

                    // addWidget(answers.widget_name, function(err){
                    //     if(err) {
                    //         bbscaff.logError(err)
                    //     } else {
                    //         bbscaff.logSuccess(answers.widget_name, 'successfully added to your portal enterprise catalog.')
                    //     }
                    // })
                }
            });
        });
    });
};