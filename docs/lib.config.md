lib/config module
===================

Use this module for recursive auto parsing of configuration files as discussed at [issue #7](https://github.com/Backbase/bb-cli/issues/7).

It also contains getCommon method for retreiving instances of preconfigured commonly used libraries (bbrest and jxon).

### .get(cliConfig)
- returns all configuration values
- _cliConfig_ - optional cli configuration object
``` js
config.get(cliConfig)
.then(function(config) {
    // config is object of different configs: bb, bbrc, global, bower, bowerrc and optionally cli
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
### .getBb()
- returns bb.json file as object
``` js
config.getBb()
.then(function(config) {
    // config is value of the ./bb.json file
});
```
### .getBbRc()
- returns local component configuration by traversing and merging values found in parent dirs
``` js
config.getBbRc()
.then(function(localConfig) {
    // localConfig is value of merged .bbrc files
});
```
### .getCommon(cliConfig)
- returns combined configuration returned by .get but also preconfigured instances of bbrest and jxon
- _cliConfig_ - optional cli configuration object
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
  "portal": "myportal"
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
  "properties": {
    "myPref": {
      "default": "5"
    }
  }
}
```

#### bower.json - [link](http://bower.io/docs/creating-packages/)
``` json
{
  "name": "my-project",
  "version": "1.0.0",
  "main": "path/to/main.css",
  "ignore": [
    ".jshintrc",
    "**/*.txt"
  ],
  "dependencies": {
    "<name>": "<version>",
    "<name>": "<folder>",
    "<name>": "<package>"
  },
  "devDependencies": {
    "<test-framework-name>": "<version>"
  }
}
```

#### .bowerrc - [link](http://bower.io/docs/config/)
``` json
{
  "directory": "app/components/",
  "analytics": false,
  "timeout": 120000,
  "registry": {
    "search": [
      "http://localhost:8000",
      "https://bower.herokuapp.com"
    ]
  }
}
```
