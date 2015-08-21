Backbase CLI tools
===================

[![Npm Version](https://badge.fury.io/js/bb-cli-nightly.svg)](https://www.npmjs.com/package/bb-cli-nightly)
[![Build Status](https://travis-ci.org/Backbase/bb-cli.svg?branch=nightly)](https://travis-ci.org/Backbase/bb-cli)

**Early preview, nightly version. Unstable.**

[Nightly] Command line tools for working with [Backbase CXP](http://backbase.com).

Scaffold new components, navigate through archetypes and work with REST API helpers using clean, automated workflow.

## Table of contents

- [Archetype](#archetype)
- [Generate](#generate)
- [Export](#export)
- [Import](#import)
- [Import Collection](#import-collection)
- [Import Item](#import-item)
- [Sync](#sync)
- [Rest](#rest)
- [Ln](#ln)
- [Install](#install)
- [Configuration](#configuration)

## Install

```shell
npm install --global bb-cli@nightly
```

### Requirements
- [Node.js](http://nodejs.org/) v0.11.15 or higher


## Commands

Each command have it's own help section `bb COMMAND -h`, filled with all information about arguments, default values and examples.

Global help is also available:

```
bb -h
```

### <a name="archetype"></a>Archetype

By typing a simple command you can now check out a new `mvn archetype` by executing the command:

```
bb archetype
```

Or use it's short version:

```
bb arch
```

Read more about Archetype API [here](/docs/archetype.md).

### <a name="generate"></a>Generate

Scaffold new widgets, containers and other Backbase CXP components.

In directory where you run the command, tool will generate starting template for chosen item.

```
bb generate widget
```

```
bb generate container
```

##### Launchpad 0.12 Generators

For Launchpad 0.12 development, please use the following commands:

```
bb generate lp12-widget
```

```
bb generate lp12-module
```

Read more about generate API [here](/docs/generate.md).

### <a name="export"></a>Export

```
bb export [OPTIONS]
```

Exports portal. Chunk option will divide export into separate xml files grouped by item type.
It will also pretty print xml files and sort items and properties alphabetically on name.
`bb rest` options for defining host, port, contaxt, username and password also work. Or you can define those properties inside .bbrc file.

##### Options

```
  -s,  --save <string>			    portal-name.ext	 File or dir to save the export to.
  -t,  --type <string>			    model		     What to export: model(portal without content), portal, widget, container
  -n,  --name <string>					             Name of the widget or container to export.
  -C,  --item-context <string>		[BBHOST]	     Context of the widget or container that is to be exported.
       --pretty <boolean>			true		     Prettify the output.
       --sanitize <boolean>			true		     Sanitize the output.
  -k,  --chunk <boolean>			false		     Parse output and chunk it into multiple files.
  -f,  --force <boolean>			false		     Force overwrite.
```

##### Examples

Outputs prettified, sorted xml file.
```
bb export
```

Saves export to myPortal.xml
```
bb export --save myPortal.xml
```

Chunks export to myPortal dir
```
bb export --portal my-portal --save myPortal -k
```

Saves export including content to retail.zip
```
bb export --type portal --save retail.zip
```

Chunks full export into retail dir
```
bb export --type portal --portal retail-banking --save retail -k
```

Chunks widget-accounts export to accounts dir
```
bb export -s accounts --type widget --name widget-accounts -k
```

### <a name="import"></a>Import

```
bb import [OPTIONS]
```

Imports portal exported by export tool. It supports importing of chunked exports.

##### Options

```
-t,  --target <string>			       File or dir to import.
```

##### Examples

Imports portal from myPortal.xml

```
bb import --target myPortal.xml
```

Imports bb export chunked portal from chunked dir

```
bb import --target chunked
```

### <a name="import-collection"></a>Import Collection

```
bb import-collection [OPTIONS]
```

Imports collection of items to the portal.
This tool will get information from the bower and zip every component, then upload it via REST API(import package) to the server.  

All components should contain `model.xml` files. In case that they don't, tool will ignore them.
If `--auto` option is set, component will be installed to the portal as feature.

Version property is automatically added to each item.

`bb rest` options for defining host, port, contaxt, username and password also work.
Or you can define those properties inside `.bbrc` file.

#### Requirements

Backbase CXP v5.6  
[Bower](http://bower.io')

##### Options

```
  -t,  --target <string>                  Dir where bower.json is.
  -a,  --auto <boolean>                    Auto generate model.xml when it is missing.

  -H,  --host <string>		localhost	  The host name of the server.
  -P,  --port <number>		7777		  The port of the server.
  -c,  --context <string>	portalserver  The application context of the portal.
  -u,  --username <string>	admin		  Username.
  -w,  --password <string>	admin		  Password.
  -p,  --portal <string>                  Name of the portal to target.
```

##### Examples

Imports collection from the current directory.
Every component without `model.xml` file will be installed as feature.

```
bower install
bb import-collection --auto
```

### <a name="import-item"></a>Import Item

```
bb import-item [OPTIONS]
```

Imports item to the portal.
This tool will zip targeted directory, then upload it via REST API(import package) to the server.  

Target directory should contain `model.xml` file.
If `--watch` option is set, component will be installed to the portal as feature.
Directories `.git`, `.gitignore`, `bower_components` and `node_modules` are ignored by watch process.

`bb rest` options for defining host, port, contaxt, username and password also work.
Or you can define those properties inside `.bbrc` file.

#### Requirements

Backbase CXP v5.6  

##### Options

```
  -t,  --target <string>                  Dir to import.
  -w,  --watch <boolean>                   Watch for file changes and autosubmit.

  -H,  --host <string>		localhost	  The host name of the server.
  -P,  --port <number>		7777		  The port of the server.
  -c,  --context <string>	portalserver  The application context of the portal.
  -u,  --username <string>	admin		  Username.
  -w,  --password <string>	admin		  Password.
  -p,  --portal <string>                  Name of the portal to target.
```

##### Examples

Imports directory as item to the portal. Then it watches for file changes and re-imports whenever a file is changed.

```
bb import-item --watch
```

### <a name="sync"></a>Sync

Syncs local XML model with remote.
Run it in the component folder to sync with CXP. It parser the first `*.xml` file or defined one from `--file` argument.
In case that xml file does not exist, it can create one by saving the response from the REST API call.
This call will be made on server catalog for the item defined by `--save` parameter.
In case that `--save` is undefined, it will search for `bower.json` file and use the name of the package as item name (handy for LP widgets).

```
bb sync [OPTIONS]	 Syncs local XML model with remote.
```

##### Options

```
  -short,  --name (type)        default              description

      -f,  --file (string)	    first xml file		 A file to target.
      -c,  --context (string)	portalserver		 Portal server context (for other options use `.bbrc`).
      -s,  --save (string)	            			 Name of the server item which model should be exported to a file.
      -y,  --yes (boolean)	            			 Disables dialogs.
      -v,  --verbose		    false   			 Prints detailed output.
```

### <a name="rest"></a>Rest

Command line version of Backbase [Rest API library](https://github.com/Backbase/mosaic-rest-js) for low level and precise tasks.

```
bb rest [OPTIONS]
```

##### Options

```
-short, --name <type>           default         description

-H,  --host <string>		    localhost	    The host name of the server running portal foundation.
-P,  --port <number>		    7777		    The port of the server running portal foundation.
-c,  --context <string>		    portalserver	The application context of the portal foundation.
-u,  --username <string>		admin   		Username.
-w,  --password <string>		admin	    	Password.
-p,  --portal <string   >				        Name of the portal on the server to target.
-t,  --target <string>		    server		    Context target: server, portal, catalog, portalCatalog, page, container, widget, link, template, user, group, audit or cache.
-T,  --target-arg <string/json>			        Target arguments. When there are more arguments, pass JSON array.
-m,  --method <string>		    get		        HTTP method to use: get, post, put or delete.
-f,  --file <string/json>				        Path of the file to send. Or JSON string when using mosaic-xml-js.
-r,  --rights					                Targets context rights.
-g,  --tags					                    Targets context tags.
-q,  --query <json>				                Sets query string.
-x,  --empty-cache				                Shortcut to empty all server caches.
-v,  --verbose					                Prints detailed output.
-s,  --save <string>				            Saves response into file.
```

### <a name="ln"></a>Ln (Symlink)

Symlinks source directory to defined target.

Use this command to symlink clone of your widget/module working repo to the working portal.

```
bb ln --source /component/path --target /path/to/portalserver/static/dir/
```

##### Helpers

This command also supports conventions used in Launchpad and ES. For example:

If `--lp-trunk` path is set, target will be:

`{lp path}/launchpad-bundles/static/launchpad/{bundle}/widgets/{package name}`

If `--lp-portal` path is set, target will be:

`{cxp portal path}/src/main/webapp/static/launchpad/{bundle}/widgets/{package name}`

As LP convention, if package name starts with `widget-` it will be stripped out when creating a symlink.

If `--portal` path is set, target will be:

`{cxp portal path}/src/main/webapp/static/widgets/{package name}`

where `package_name` will be the name of the package read from `bower.json` or `package.json`.

##### Options

```
-short, --name <type>       default               description

-s,  --source <string>      current directory     Path to source directory.
-t,  --target <string>                            Path to directory in which to (un)link a source.
     --lp-trunk <string>                          Path to `launchpad-trunk`.
     --lp-portal <string>                         Path to portalserver containing lp.
     --portal <string>                            Path to portalserver.
-f,  --force                                      Force removal of the target.
-u,  --unlink                                     Remove symlink.
```

### <a name="install"></a>Install

```
bb install [OPTIONS]
bb install <bower-endpoint> [<bower-endpoint> ..] [OPTIONS]
```

Wraps a `bower install` and applies additional options like `requirejs-conf` generation and server catalog update.

##### Options

```
    -C,  --catalog <boolean>		false			    Upload components to CXP via REST after install.
    -v,  --verbose <boolean>		false			    Enable verbose logging mode.
         --base-url <string>        path/to/bower_comp	Web path to bower components directory (also configurable from .bbrc).
         --require-confs <string>				        Coma seperated list of relative paths to existing require configuration (also configurable from .bbrc).
```

Also accepts `bower install` arguments like --save, -save-dev, --production, check `bower install -h`.

##### Examples

```
bb install jquery --save
bb install todo-widget -C --save
```


## <a name="configuration"></a>Configuration

All REST based commands support `.bbrc` configuration. Running the command in the folder with `.bbrc` file or in one of the child folders with defined configuration, CLI will use it to override default options.

Example of `.bbrc` (must contain valid JSON) contents:

```json
{
"context": "/",
"port": "7778",
"username": "me",
"password": "it's me"
}
```

### Usage example

If CXP based project has custom configuration for context or admin credentials, put custom `.bbrc` into the root folder, so CLI could use custom defaults.

```
/project
  .bbrc
  config
    some.xml
```

Where `.bbrc` file contains this conf:

```
{
"context": "/",
"username": "me",
"password": "it's me"
}
```

Now running `bb import` from `/project/config` dir, CLI will use defined REST configuration with overriden `context` and user credentials.

## API docs

Programmatic API.

* [config](/docs/lib.config.md)
* [portalUtils](/docs/lib.portalUtils.md)

___

Copyright © 2015 Backbase B.V.
