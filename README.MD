bbscaff 0.0.8
===================

> bbscaff is a command line tool that helps you generating and importing components to Backbase CXP **5.5.x**.
> You can easily create widgets, containers and automatically add to your portal catalog with just one command.

## Requirements
- [Node.js](http://nodejs.org/)

## Install
``` shell
$ npm install -g bbscaff
```

## Usage

### Generating Widgets
Inside `/yourBundleName/widgets` type:

``` shell
$ bbscaff generate widget
```

### Generating Containers
Inside `/yourBundleName/containers` type:

``` shell
$ bbscaff generate container
```


## Creating your own templates

Create your own template might be useful either to replace an existing bbscaff template or to create your custom template.
When you type `bbscaff generate <template>` the CLI will first try to find the template in your `~/.bbscaff/` folder and after on the built-in templates.

### Folder structure
2
The name of your folder insite ~/.bbscaff/ is your template name. This is how a template folder should look like:

    .
    ├── template                # All files that need to be copied
    └── bbscaff.js              # Configuartion file


### API

`bbscaff.js` is basically a node.js module. You need to export a function that receives a new instance off bbscaff as the first argument.

``` js
module.exports = function(bbscaff){}
```

--------------------

##### bbscaff.prompt(questions, callback)
Prompt necessary questions to inject data in your templates. Please see [Inquirer](https://github.com/SBoudrias/Inquirer.js) for more details.

``` js
bbscaff.prompt([{
		name: 'name',
		message: 'Name'
	}], function(answers){

	})
})
```

--------------------

##### bbscaff.generate(data, destination_path, callback)
Copy files from template to the current folder. bbscaff will parse all your files as [Lo-Dash](https://lodash.com/docs#template) templates. You can print variables `<%=myVariable%>`, make loops and so on.
If you want to rename files, just put the variable in the name of your file between mustaches. `{myVariable}.js`

``` js
bbscaff.generate(answers, answers.widget_name, function(){})
```

--------------------

##### bbscaff.getCurrentBundle()
Returns the current bundle name.

--------------------

##### bbscaff.getPrefix(string)
Returns string as prefix. Ex: `my-bundle` => `mb`

--------------------

##### bbscaff.toCamelCase(string)
Returns string in CamelCase. Ex: `my-bundle` => `MyBundle`

--------------------

##### bbscaff.request(request_object, callback)
Used to make requests to the portalserver REST Api. It handles authentication and sets proper headers. Please see [request](https://github.com/request/request) for more details.

``` js
fs.readFile('file.xml'), "utf8", function(err, content){
	if(err) return;
	bbscaff.request({url: 'http://localhost:7777/portalserver/catalog', body: content}, function(err, httpResponse, body){})
})
```

### Example of a basic `bbscaff.js`

``` js
module.exports = function(bbscaff){
	bbscaff.prompt([
		{
			name: 'name',
			message: 'Name'
		}
	], function(answers){
		bbscaff.generate(answers, answers.name)
	})
}
```
