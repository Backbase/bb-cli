lib/config module
===================

Use this module for recursive auto parsing of configuration files as discussed at [issue #7](https://github.com/Backbase/bb-cli/issues/7).

It also contains getCommon method for retreiving instances of preconfigured commonly used libraries (bbrest and jxon).

### .get()
- returns all configuration values
``` js
config.get()
.then(function(config) {
    // config is value of the ./bb.json file with _global and _local keys that store other 2 configs
});
```
### .getGlobal
- returns global configuration file
``` js
config.getGlobal
.then(function(globalConfig) {
    // globalConfig is value of the ~/.backbase/bb-cli.json
});
```
### .getConfig()
- returns main component configuration bb.json file
``` js
config.getConfig()
.then(function(config) {
    // config is value of merged ./bb.json files
});
```
### .getLocal()
- returns local component configuration by traversing and merging values found in parent dirs
``` js
config.getLocal()
.then(function(localConfig) {
    // localConfig is value of merged .bbrc files
});
```
### .getCommon()
- returns combined configuration returned by .get but also preconfigured instances of bbrest and jxon
``` js
config.getCommon()
.then(function(obj) {
    // obj contains config, bbrest and jxon keys
});
```
### .absolutizePath(path)
- returns abolute path given the relative path or home dir path staring with ~
``` js
config.absolutizePath()
.then(function(aPath) {
    // aPath is absolute path
});
```

## Configuration file examples

#### ~/.backbase/bb-cli.json
``` json
{
    "name": "John Smith",
    "email": "jsmith@example.com"
}
```

#### .bbrc
``` json
{
  "path": "/path/to/the/portalserver",
  "username": "john",
  "password": "HU&69wev*!$8",
  "portal": "myportal",
  "bower": {
    "directory": "lib"
  }
}
```

#### bb.json
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
  "properties": {
    "myPref": {
      "default": "5"
    }
  }
}
```
