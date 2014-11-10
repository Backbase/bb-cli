var fs = require('fs');
var path = require('path');

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
				return answers.container_title.replace(/ /gi, '-').toLowerCase()
			},

			validate: function(string){
				return string.split(/ /).length == 1
			}
		},
		{
			name: 'template_name',
			message: 'Template name',
			'default': function(answers){
				return bbscaff.toCamelCase(answers.container_name)
			},

			validate: function(string){
				return string.split(/[- \.]/).length == 1
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

		bbscaff.generate(answers, answers.container_name, function(){
			bbscaff.prompt({
				name: 'add_container',
				type: 'confirm',
				message: 'Do you want to add this container (with template) to your Enterprise Catalog?'
			}, function(answer){
				if(answer.add_container){
					postContainer(answers.container_name, answers.template_name, function(err){
						if(err) {
							bbscaff.logError(err)
						} else {
							bbscaff.logSuccess(answers.template_name, 'successfully added to your portal enterprise catalog.')
							bbscaff.logSuccess(answers.container_name, 'successfully added to your portal enterprise catalog.')
						}
					})

				}
			})
		})
	})


	function postContainer(container_name, template_name, callback){
		fs.readFile(path.join(process.cwd(), container_name, 'template-'+template_name+'.xml'), "utf8", function(err, content){
			bbscaff.request({url: 'http://localhost:7777/portalserver/templates', body: content}, function(err, httpResponse, body){
				if(!err && httpResponse.statusCode == '201') {
					fs.readFile(path.join(process.cwd(), container_name, 'catalog-'+container_name+'.xml'), "utf8", function(err, content){
						bbscaff.request({body: content}, function(err, httpResponse, body){
							if(!err && httpResponse.statusCode == '204') {
								callback()
							} else {
								callback(err || 'Error trying to add the container trough REST: ' + httpResponse.statusCode)
							}
						})
					})

				} else {
					callback(err || 'Error trying to add the template trough REST: ' + httpResponse.statusCode)
				}
			})
		})
	}

}


