# Backbase dependency management tools

To use Backbase CLI tools for managing components and client-side dependencies in you project, you need to:

1. Install tools
2. Configure your Backbase project

## Install

First be sure that you have Git and Node.js installed on your system. Then install `backbase-cli` tools with `bower`:

```
$ npm i bower -g
$ git clone https://github.com/sourcejs/backbase-cli && cd backbase-cli && npm link
```

Note that current backbase-cli tools are stored in temporary repository.

## Backbase Project configuration

First versions were tested only for compatibility with launchpad 11 archetype.

### Init bower

To prepare your Backbase portal for new component dependencies structure, you need to initialize bower in project root (where you have `portalserver` folder):

```
$ bb init
```

You will be prompted with few questions, you can keep everything in default values.

### Conf paths

Add arrays with paths to your existing `requirejs-conf.js`:

```
"requirejsConfigs": [
    "portalserver/src/main/webapp/static/launchpad/conf/require-conf.js"
]
```

If you're using launchpad 11 archetype, this will be already filled during init.

### Add link to generated conf

Configure your templates, or build script to include `portalserver/src/main/webapp/static/bower_components/require-bower-config.js` in your web application.

If launchpad 11, link to `require-config` should be placed in `lp11/portalserver/src/main/webapp/WEB-INF/launchpad/pages/launchpad-lib.jsp`:

```html
<script src="/portalserver/static/bower_components/require-bower-config.js"></script>
```

## Commands

### Bower Init

Initializes Bower in current directory with Backbase specific defaults.

```
bb bower init
```

### Install

Install all Bower dependencies and generate RequireJS configuration. Run this command in your project root, with prepared `bower.json`.

```
bb install
```

By default, RequireJS conf will be saved to `portalserver/src/main/webapp/static/bower_components/require-bower-config.js`.

Find more information about process behind `bb install` in [proposal doc](https://github.com/operatino/backbase-widget-dependencies-proposal) (could be slightly unsynced).

#### Instal <name>

Install any bower dependencies and generate `require-config` after.

```
bb install <name>
```

TODO: make `bb install` a full mirror to `bower install`, now it doesn't support flags.

### Uninstall <name>

TODO (not done yet)

```
bb uninstall <name>
```

## Examples

Init (only once) your project, and install some demo widgets:

```
bb init
bb install https://github.com/operatino/backbase-robert.git#sep-feed
bb install https://github.com/operatino/backbase-robert.git#sep-bundle
```

Widgets will be downloaded to `lp11/portalserver/src/main/webapp/static/bower_components` folder, to get them in portal, you will need to import their XML's through YAPI.

 Automatic components import will be added in next releases.