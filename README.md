Backbase CLI tools
===================

[![Npm Version](https://badge.fury.io/js/bb-cli.svg)](https://www.npmjs.com/package/bb-cli)
[![Build Status](https://travis-ci.org/Backbase/bb-cli.svg)](https://travis-ci.org/Backbase/bb-cli)

Command line tools for working with [Backbase CXP](http://backbase.com).

Scaffold new components, navigate through archetypes and work with REST API helpers using clean, automated workflow.


## Install

```shell
npm i bb-cli --global
```

### Requirements
- [Node.js](http://nodejs.org/)


## Commands

Each command have it's own help section `bb COMMAND -h`, filled with all information about arguments, default values and examples.

Global help is also available:

```
bb -h
```

### Archetype

By typing a simple command you can now check out a new `mvn archetype` by executing the command:

```
bb archetype
```

Or use it's short version:

```
bb arch
```

Read more about Archetype API [here](/docs/archetype.md).

### Generate

Scaffold new widgets, containers and other Backbase CXP components.

In directory where you run the command, tool will generate starting template for chosen item.

``` shell
$ bb generate widget
```

``` shell
$ bb generate container
```

#### Launchpad 0.12 Generators

For Launchpad 0.12 development, please use the following commands:

``` shell
$ bb generate lp12-widget
```

``` shell
$ bb generate lp12-module
```

Read more about generate API [here](/docs/generate.md).

### Export

Export portal model into XML files, which can be then re-imported trough YAPI or `bb import`.

```
bb export
```

By default, command exports whole portal as one file. Using `--structured` option (beta) command will breaks portal model into separate files, structuring them by logical groups.

Generated XML files are placed to the working directory, from where you have spawned the command.

### Import

Imports portal model from XML files.

```
bb import
```

By default uses full portal import (from one file). Using `--yapi` option (beta) command will merge all XML files by glob and import them like client-side YAPI does.

### Sync

Syncs local XML model with remote.
Run it in the component folder to sync with CXP. It parser the first `*.xml` file or defined one from `--file` argument.
In case that xml file does not exist, it can create one by saving the response from the REST API call.
This call will be made on server catalog for the item defined by `--save` parameter.
In case that `--save` is undefined, it will search for `bower.json` file and use the name of the package as item name (handy for LP widgets).

```
bb sync [OPTIONS]	 Syncs local XML model with remote.
```

#### Options

```
  -short,  --name (type)        default              description

      -f,  --file (string)	    first xml file		 A file to target.
      -c,  --context (string)	portalserver		 Portal server context (for other options use `.bbrc`).
      -s,  --save (string)	            			 Name of the server item which model should be exported to a file.
      -y,  --yes (boolean)	            			 Disables dialogs.
      -v,  --verbose		    false   			 Prints detailed output.
```

### Rest

Command line version of Backbase [Rest API library](https://github.com/Backbase/mosaic-rest-js) for low level and precise tasks.

```
bb rest [OPTIONS]
```

#### Options

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

### Ln (Symlink)

Symlinks source directory to defined target.

Use this command to symlink clone of your widget/module working repo to the working portal.

```
bb ln --source /component/path --target /path/to/portalserver/static/dir/
```

#### Helpers

This command also supports conventions used in Launchpad and ES. For example:

If `--lp-trunk` path is set, target will be:

`{lp path}/launchpad-bundles/static/launchpad/{bundle}/widgets/{package name}`

If `--lp-portal` path is set, target will be:

`{cxp portal path}/src/main/webapp/static/launchpad/{bundle}/widgets/{package name}`

As LP convention, if package name starts with `widget-` it will be stripped out when creating a symlink.

If `--portal` path is set, target will be:

`{cxp portal path}/src/main/webapp/static/widgets/{package name}`

where `package_name` will be the name of the package read from `bower.json` or `package.json`.

#### Options

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


## Configuration

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
