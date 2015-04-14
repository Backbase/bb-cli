Backbase CLI tools
===================

Command line tools for working with [Backbase CXP](http://backbase.com).

Scaffold new components, navigate through archetypes and work with REST API helpers using clean, automated workflow.

## Requirements
- [Node.js](http://nodejs.org/)

## Install

``` shell
npm i bb-cli --global
```

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

Read more about generate API [here](/docs/generate.md).

## Export

Export portal model into xml files. This files can be then imported trough Yapi or `bb import`.

```
bb export
```

Generated bundle with XML files is placed to the working directory, from where you have spawned the command.

## Import

Imports portal model from xml files. CLI for YAPI portal importer.

```
bb import
```

## Sync

Syncs local XML model with remote.

```
bb sync
```

Run it in the component folder to sync with CXP. It parser the first `*.xml` file or defined one from `--file` argument.

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

## API docs

Programmatic API.

* [config](/docs/lib.config.md)
* [portalUtils](/docs/lib.portalUtils.md)

___

Copyright 2015 Backbase B.V.
