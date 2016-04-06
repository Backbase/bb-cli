Backbase CLI tools
===================

[![Npm Version](https://badge.fury.io/js/bb-cli.svg)](https://www.npmjs.com/package/bb-cli)
[![Build Status](https://travis-ci.org/Backbase/bb-cli.svg)](https://travis-ci.org/Backbase/bb-cli)

Command line tools for working with [Backbase CXP](http://backbase.com).

Scaffold new components, navigate through archetypes and work with REST API helpers using clean, automated workflow.

## Table of contents

- [Generate](#generate)
- [Export](#export)
- [Import](#import)
- [Import Collection](#import-collection)
- [Import Item](#import-item)
- [Theme Build](#theme-build)
- [Sync](#sync)
- [Rest](#rest)
- [Ln](#ln)
- [Install](#install)
- [Configuration](#configuration)
- [Setup .bbscaff directory](/docs/bbscaff-setups.md)

## Install

```shell
npm install --global bb-cli
```

### Requirements
- [Node.js](http://nodejs.org/) v0.11.15 or higher

## Commands

Each command has its own help section `bb COMMAND -h`, containing information about arguments, default values and examples.

Global help is also available:

```
bb -h
```

### <a name="generate"></a>Generate

Scaffold new widgets, containers and other Backbase CXP components.

The tool generates the starting template for the chosen item in the directory where you run the command.

```
bb generate widget
```

```
bb generate container
```

```
bb generate project
```

```
bb generate template
```

Read more about generate API [here](/docs/generate.md).

### <a name="export"></a>Export

```
bb export [OPTIONS]
```

Exports portal. The chunk option exports to separate xml files grouped by item type.
It will also pretty print xml files and sort items and properties alphabetically on name.
`bb rest` options for defining host, port, context, username and password also work. You can define those properties inside the .bbrc file.

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

Outputs prettified, sorted xml file:
```
bb export
```

Saves export to myPortal.xml:
```
bb export --save myPortal.xml
```

Chunks export to myPortal dir:
```
bb export --portal my-portal --save myPortal -k
```

Saves export, including content, to retail.zip:
```
bb export --type portal --save retail.zip
```

Chunks full export into retail dir:
```
bb export --type portal --portal retail-banking --save retail -k
```

Chunks widget-accounts export to accounts dir:
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

Imports portal from myPortal.xml:

```
bb import --target myPortal.xml
```

Imports a portal exported with bb export and the chunk option from the dir chunked:

```
bb import --target chunked
```

### <a name="import-collection"></a>Import Collection

```
bb import-collection [OPTIONS]
```

Imports a collection of items into the portal.
This tool gets information from the bower and zip for every component, then uploads it via REST API (import package) to the server.

All components should contain `model.xml` files. Any component without a `model.xml` file is ignored, unless the  `--auto` option is set, in which case the component will be installed to the portal as a feature.

The version property is automatically added to each item.

`bb rest` options for defining host, port, context, username and password also work.
Or you can define those properties inside a `.bbrc` file.

##### Requirements

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

Imports a collection from the current directory.
Every component without a `model.xml` file will be installed as a feature.

```
bower install
bb import-collection --auto
```

### <a name="import-item"></a>Import Item

```
bb import-item [OPTIONS]
```

Imports item to the portal.
This tool zips the targeted directory, then uploads it to the server via REST API(import package).

Target directory should contain `model.xml` file.
If `--watch` option is set, component will be installed to the portal as feature.
Directories `.git`, `.gitignore`, `bower_components` and `node_modules` are ignored by watch process.

`bb rest` options for defining host, port, contaxt, username and password also work.
Or you can define those properties inside `.bbrc` file.

#### Requirements

Backbase CXP v5.6

##### Options

```
  -t,  --target <string>        Current directory   Dir to import.
  -W,  --watch <boolean>                             Watch for file changes and autosubmit.
  -l,  --collection <boolean>                        Watch collection directory tree for changes.
  -i,  --init-import <boolean>                       Import whole collection on init.
  -a,  --auto <boolean>                              Auto create model.xml if doesn't exist.
  -n,  --name <boolean>                              Name of the feature to auto create before reading bower.json
  -v,  --version <boolean>                           Version of the feature to auto create before reading bower.json
       --verbose <boolean>                           Enables detailed output.

  -H,  --host <string>          localhost           The host name of the server.
  -P,  --port <number>          7777                The port of the server.
  -c,  --context <string>       portalserver        The application context of the portal.
  -u,  --username <string>      admin               Username.
  -w,  --password <string>      admin               Password.
  -p,  --portal <string>                            Name of the portal to target.
```

##### Examples

Imports current directory as item to the portal. Then it watches for file changes and re-imports whenever a file is changed.

```
bb import-item --watch
```

### <a name="theme-build"></a>Theme Build

Builds a theme.
Requires a bower.json file in the directory with a "main" array pointing to the base and core less files

```
bb theme-build
```

##### Options

```
-short, --name                 default      description

-t,  --target <string>                 .            Path to directory to build.
-e,  --edition <string>                             Pass edition var to less.
-b,  --base-path <string>                           Pass base-path var to less.
-s   --sourcemaps                                   Whether to generate source maps.
-w   --watch                                        Watch less files and rebuild on change.
     --disable-compress                             Don't compress CSS into .min files.
     --disable-ie                                   Don't create reworked .ie files for IE8.
     --disable-assets                               Don't collect font/image assets.
-i   --import                                       Run bb import-item after building.
```

### <a name="sync"></a>Sync

Syncs local XML model with remote.
Run it in the component folder to sync with CXP. It parses the first `*.xml` file or the one defined with the `--file` argument.
If that xml file does not exist, one is created by saving the response from the REST API call.
This call is made on server catalog for the item defined by the `--save` parameter.
If `--save` is undefined, it will search for the `bower.json` file and use the name of the package as item name (handy for LP widgets).

```
bb sync
```

##### Options

```
-short, --name (type)          default              description

-f,  --file (string)	    first xml file		 A file to target.
-c,  --context (string)	portalserver		 Portal server context (for other options use `.bbrc`).
-s,  --save (string)	            			 Name of the server item for which the model is to be exported to a file.
-y,  --yes (boolean)	            			 Disables dialogs.
-v,  --verbose		    false   			 Prints detailed output.
```

### <a name="rest"></a>Rest

Command line version of Backbase [Rest API library](https://github.com/Backbase/mosaic-rest-js) for low-level and precise tasks.

```
bb rest [OPTIONS]
```

##### Options

```
-short, --name <type>               default         description

-H,  --host <string>		    localhost	    The host name of the server running portal foundation.
-P,  --port <number>		    7777		    The port of the server running portal foundation.
-c,  --context <string>		    portalserver	The application context of the portal foundation.
-u,  --username <string>		admin   		Username.
-w,  --password <string>		admin	    	Password.
-p,  --portal <string>				        Name of the portal on the server to target.
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

Use this command to symlink a clone of your widget/module working repo to the working portal.

```
bb ln --source /component/path --target /path/to/portalserver/static/dir/
```

##### Helpers

This command also supports conventions used in Launchpad and ES. For example:

If `--lp-trunk` path is set, target will be:

`{lp path}/launchpad-bundles/static/launchpad/{bundle}/widgets/{package name}`

If `--lp-portal` path is set, target will be:

`{cxp portal path}/src/main/webapp/static/launchpad/{bundle}/widgets/{package name}`

Following the LP convention, if the package name starts with `widget-` it will be stripped out when creating a symlink.

If `--portal` path is set, target will be:

`{cxp portal path}/src/main/webapp/static/widgets/{package name}`

where `package_name` will be the name of the package read from `bower.json` or `package.json`.

##### Options

```
-short, --name <type>          default               description

    -s, --source <string>      current directory     Path to source directory.
    -t, --target <string>                            Path to directory in which to (un)link a source.
        --lp-trunk <string>                          Path to `launchpad-trunk`.
        --lp-portal <string>                         Path to portalserver containing lp.
        --portal <string>                            Path to portalserver.
    -f, --force                                      Force removal of the target.
    -u, --unlink                                     Remove symlink.
```

### <a name="install"></a>Install

Wraps a `bower install` and applies additional options like RequireJS conf generation and server catalog update.

#### Options

```
-short, --name <type>               default             description

     C, --catalog <boolean>		    false			    Upload single component to CXP via REST after install.
    -A, --catalog-all <boolean>	    false			    Upload all installed components to CXP via REST after install.
    -n, --nested <boolean>		    false			    Run secondary `bb install` in installed component.
    -v, --verbose <boolean>		    false			    Enable verbose logging mode.
        --base-url <string>		    path/to/bower_comp	Web path to bower components directory (also configurable from .bbrc).
        --require-confs <string>				        Coma seperated list of relative paths to existing require configuration (also configurable from .bbrc).
```

Available options in `.bbrc`:

```
{
  "install": {
    "excludes": ["jquery"],
    "includes" ["jquery"],
    "requirejsConfigs": ["./portal/target/portal/static/launchpad/modules/config/requirejs.conf.js"],
    "requirejsBaseUrl": "bower_components"
  }
}
bb install [OPTIONS]
bb install <bower-endpoint> [<bower-endpoint> ..] [OPTIONS]
```

Also accepts `bower install` arguments such as --save, -save-dev, --production, check `bower install -h`.

##### Examples

```
bb install jquery --save
bb install todo-widget -C --save
```

* `excludes` - define paths to exclude from generated RequireJS conf
* `includes` - define paths to include to generated RequireJS conf, ignoring existing configurations merge
* `requirejsConfigs` - list of paths to existing RequireJS confs, to automatically get excludes list
* `requirejsBaseUrl` - base url for paths in RequireJS conf

## <a name="configuration"></a>Configuration

All REST-based commands support a `.bbrc` configuration file. The `.bbrc` file is looked for first in the current directory, and then recursively in parent directories. The first `.bbrc` file encountered is used. This allows the default configuration to be overridden.

Example of `.bbrc` (must contain valid JSON) content:

```json
{
"context": "/",
"port": "7778",
"username": "me",
"password": "it's me"
}
```

### Example

If a CXP-based project has a custom configuration for context or admin credentials, put a custom `.bbrc` in the root folder, so CLI can use custom defaults.

```
/project
  .bbrc
  config
    some.xml
```

Where the `.bbrc` file contains this conf:

```
{
  "scheme": "http",
  "host": "localhost",
  "port": "7777",
  "context": "portalserver",
  "username": "me",
  "password": "it's me",
  "portal": "myportal",
  "path": "/path/to/the/portalserver"
}
```

When running `bb import` from `/project/config` dir, CLI will use the defined REST configuration with overriden `context` and user credentials.

## API docs

Programmatic API.

* [config](/docs/lib.config.md)
* [portalUtils](/docs/lib.portalUtils.md)

___

Copyright © 2016 Backbase B.V.
