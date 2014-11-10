var fs = require('fs');
var path = require('path');

module.exports = function(bbscaff){
	bbscaff.prompt([
		{
			name: 'widget_title',
			message: 'Widget title'
		},
		{
			name: 'widget_name',
			message: 'Widget name',
			'default': function(answers){
				return answers.widget_title.replace(/ /gi, '-').toLowerCase()
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
					addWidget(answers.widget_name, function(err){
						if(err) {
							bbscaff.logError(err)
						} else {
							bbscaff.logSuccess(answers.widget_name, 'successfully added to your portal enterprise catalog.')
						}
					})
				}
			})
		})
	})

	function addWidget(widget_name, callback){
		fs.readFile(path.join(process.cwd(), widget_name, 'catalog-'+widget_name+'.xml'), "utf8", function(err, content){
			bbscaff.request({body: content}, function(err, httpResponse, body){
				if(!err && httpResponse.statusCode == '204') {
					bbscaff.logSuccess(widget_name, 'successfully added to your portal enterprise catalog.')
				} else {
					console.log(body)
					callback(err || 'Error trying to add the widget trough REST: ' + httpResponse.statusCode)
				}
			})
		})
	}
}