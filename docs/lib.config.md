lib/config module
===================

Use this module for recursive auto parsing of configuration files as discussed at [issue #7](https://github.com/Backbase/bb-cli/issues/7).

It also contains getCommon method for retreiving instances of preconfigured commonly used libraries (bbrest and jxon).

### .get(depth)
- returns all configuration values
* depth - recursion depth. When not defined, config files are merged from the root dir, set to 0 if only cwd config should be parsed
``` js
config.get()
.then(function(config) {
    // config is value of merged ./backbase.json files with _global and _local keys that store other 2 configs
});
```
### .getGlobal
- returns global configuration file
``` js
config.getGlobal
.then(function(globalConfig) {
    // globalConfig is value of the ~/.backbase/config.json
});
```
### .getConfig(depth)
- returns main component configuration by traversing and merging values found in parent dirs
* depth - recursion depth. When not defined, config files are merged from the root dir, set to 0 if only cwd config should be parsed
``` js
config.getConfig()
.then(function(config) {
    // config is value of merged ./backbase.json files
});
```
### .getLocal(depth)
- returns local component configuration by traversing and merging values found in parent dirs
* depth - recursion depth. When not defined, config files are merged from the root dir, set to 0 if only cwd config should be parsed
``` js
config.getLocal()
.then(function(localConfig) {
    // localConfig is value of merged ./.bblocal.json files
});
```
### .getCommon(depth)
- returns combined configuration returned by .get but also preconfigured instances of bbrest and jxon
* depth - recursion depth. When not defined, config files are merged from the root dir, set to 0 if only cwd config should be parsed
``` js
config.getCommon()
.then(function(obj) {
    // obj contains config, bbrest and jxon keys
});
```

## Configuration file examples

#### ~/.backbase/conf.js
``` json
{
    "name": "John Smith",
    "email": "jsmith@example.com"
}
```

#### .bblocal.json
``` json
{
  "path": "/path/to/the/portalserver",
  "username": "john",
  "password": "HU&69wev*!$8",
  "portal": "myportal",
}
```

#### backbase.json
``` json
{
  "name": "myWidget",
  "version": "0.1.0",
  "description": "If provided by bb scaff tool",
  "authors": [{
    "name": "Name Set By bb config",
    "email": "email.set@by.config.bb"
  }],
  "repository": {
    "type": "git",
    "url": "git://path.to.users.stash.repository/provided.by.bb.config.git"
  },
  "license": "Backbase Standard",
  "dependencies": {
    "requirejs": "~1.2.3",
    "bb-connector": "^1.0.3",
    "portal.css": "path/to/portal.css"
  },
  "bower": {
    "directory": "lib",
  },
  "properties": {
    "myPref": {
      "default": "5"
    }
  }
}
```
