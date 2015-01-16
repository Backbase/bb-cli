# Setting up Project for working with modern dependencies

First versions were tested only for compatibility with launchpad 11 archetype.

## Installation steps

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
    "portalserver/target/launchpad.war/conf/require-conf.js"
]
```

If you're using launchpad 11 archetype, this will be already filled during init.

### Add link to generated conf

Configure your templates, or build script to include `portalserver/src/main/webapp/static/bower_components/require-bower-config.js` in your web application.

If launchpad 11, link to `require-config` should be placed in `lp11/portalserver/src/main/webapp/WEB-INF/launchpad/pages/launchpad-lib.jsp`:

```html
<script src="/portalserver/static/bower_components/require-bower-config.js"></script>
```

## Dependencies Usage Examples

Init (only once) your project, and install some demo widgets:

```
bb init
bb install https://github.com/operatino/backbase-robert.git#sep-feed
bb install https://github.com/operatino/backbase-robert.git#sep-bundle
```

Widgets will be downloaded to `lp11/portalserver/src/main/webapp/static/bower_components` folder, to get them in portal, you will need to import their XML's through YAPI.

 Automatic components import will be added in next releases.