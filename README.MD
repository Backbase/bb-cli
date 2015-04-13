Backbase CLI tools
===================

Command line tools for working with Backbase CXP.

## Requirements
- [Node.js](http://nodejs.org/)

## Install
``` shell
$ npm i bb-cli --global
```

## Commands

### Archetype

By typing a simple command you can now check out a new `mvn archetype` by executing the command:

```
bb archetype
```

Read more about Archetype API [here](https://github.com/Backbase/bb-cli/blob/master/docs/archetype.md).

### Generate

You can easily create widgets, containers and automatically add to your portal catalog with just one command.

In directory where you run the command, tool will generate starting template for chosen item:

#### Generating Widgets

``` shell
$ bb generate widget
```

#### Generating Containers

``` shell
$ bb generate container
```

Read more about generate API [here](https://github.com/Backbase/bb-cli/blob/master/docs/generate.md).


### Rest
```
  Usage: bb rest [OPTIONS]
	 Command line version of Backbase Rest API library. https://github.com/Backbase/mosaic-rest-js

  Options: -short, --name <type> default description

      -H,  --host <string>		localhost	The host name of the server running portal foundation.
      -P,  --port <number>		7777		The port of the server running portal foundation.
      -c,  --context <string>		portalserver	The application context of the portal foundation.
      -u,  --username <string>		admin		Username.
      -w,  --password <string>		admin		Password.
      -p,  --portal <string>				Name of the portal on the server to target.
      -t,  --target <string>		server		Context target: server, portal, catalog, page, container, widget, link, template, user, group, audit or cache.
      -T,  --target-arg <string/json>			Target arguments. When there are more arguments, pass JSON array.
      -m,  --method <string>		get		HTTP method to use: get, post, put or delete.
      -f,  --file <string/json>				Path of the file to send. Or JSON string when using mosaic-xml-js.
      -r,  --rights					Targets context rights.
      -g,  --tags					Targets context tags.
      -q,  --query <json>				Sets query string.
      -v,  --verbose					Prints detailed output.
      -s,  --save <string>				Saves response into file.
```
