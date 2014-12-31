# Backbase dependency management tools

To use Backbase CLI tools for managing component and client-side dependencies first read about dependencies and prepare you Backbase portal configuration.

## Dependencies

To use the tools, you must have git, node.js and globally installed `backbase-cli` with `bower`.

```
$ npm i bower -g
$ git clone https://github.com/sourcejs/backbase-cli && cd backbase-cli && npm link
```

## Backbase Project configuration

### Init bower

To prepare your Backbase portal for new component dependencies structure, you need to initialize bower in project root:

```
$ bower init
```

(later this sep will be replaced with `bb bower init`)

### Conf paths

Add arrays with paths to your existing `requirejs-conf.js`:

```
"requirejsConfigs": [
    "portalserver/src/main/webapp/static/launchpad/conf/require-conf.js"
]
```

### Static route configuration

Configure your web server to serve static files from `bower_components`.

### Add path to generated conf

Configure your templates, or build script to include `portalserver/src/main/webapp/static/launchpad/conf/require-bower-config.js` in your web application.

## Commands

### Bower Init (TODO)

```
bb bower init
```

### Install

Install all Bower dependencies and generate RequireJS configuration. Run this command in your project root, with prepared `bower.json`.

```
bb install
```

By default, RequireJS conf will be saved to `portalserver/src/main/webapp/static/launchpad/conf/require-bower-config.js`.

Find more information about process behind `bb install` in [proposal doc](https://github.com/operatino/backbase-widget-dependencies-proposal).

#### Instal <name> (TODO)

```
bb install <name>
```

### Uninstall <name> (TODO)

```
bb uninstall <name>
```