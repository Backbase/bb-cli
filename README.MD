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

### Init

Run init command to set-up your project root for working with dependencies.

``` shell
$ bb init
```

You will be prompted with few questions, you can keep everything in default values.

### Install

Installs all client-side dependencies and independent Backbase components to your project and generates `require-bower-config.js`. To install only specified component pass Bower package name, git repo, zip file or local path as a `<component-name>`.

``` shell
$ bb install [<component-name>]
```

Install tools uses [Bower](http://bower.io) as first step, so it supports all Bower flags like `--save` and other.

Note: this will work only in directories with initialized `bower.js` with Backbase specific configs. Read this [doc](https://github.com/Backbase/bb-cli/blob/master/docs/dependencies-setup.md) about setting up your CXP Project for modern dependencies management.

Find more information about process behind `bb install` in [proposal doc](https://github.com/operatino/backbase-widget-dependencies-proposal) (could be slightly unsynced).

### Deploy

Deploys current component to your project folder, following the same process what `bb install` does, but taking your local version as an source.

``` shell
$ bb deploy
```

This should be used during development of new independent components and for modified forks of already existing ones.

#### Flags

Install component to your project after deploy:

```
--install, -I
```

Define path to your project, to let tool know where to deploy. By default, tool tries to guess it or read from docs.

```
--path, -P
```

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

## Use cases

### Installing existing component

You're developing Backbase project, and want to reuse `transactions-widget` from common library.

#### Instructions

Once you've [set-up your project](https://github.com/Backbase/bb-cli/blob/master/docs/dependencies-setup.md), you just run install command in its root:

``` shell
$ bb install transactions-widget
```

### Forking existing component

You're developing Backbase project, and want to reuse `transactions-widget` from common library but you want to add some changes.

#### Instructions

Clone `transactions-widget` anywhere you want in your file system (preferable somewhere in nested project folder). Make changes you need.

Once you've [set-up your project](https://github.com/Backbase/bb-cli/blob/master/docs/dependencies-setup.md), you can deploy any local components into it. Run this command from cloned component folder:

```
bb deploy
```

Test changes on your development server.

### Developing new independent component

You want to create new independent component, which anyone could install to their own projects

#### Instructions

Scaffold new component using `bb generate` anywhere you want. Write components code, and when you're ready to test it on development server, run `bb deploy` command from components folder.
