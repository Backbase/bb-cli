lib/portalUtils module
===================

Use this module to retrieve various portal information.


### .getPom(config, path)
returns JXON parsed presentation of pom.xml

* config - common configuration object containing config, bbrest and jxon, see lib/config docs
* path - by default pom.xml from the root of the project is returned. use this parameter to add string to the path

``` js
portalUtils.getPom
.then(function(jx) {
    // jx is pom.xml in jxon notation
});
```
### .getStaticFiles(config, mask)
traverses target/static and returns all file paths or the masked ones only

* config - common configuration object containing config, bbrest and jxon, see lib/config docs
* mask - filename mask

``` js
portalUtils.getStaticFiles(config, 'readme.md')
.then(function(files) {
    // files will contain paths to all files
});
```
### .getRequireConfs(config)
traverses target/static and returns object where keys are paths to found require-conf.js files and values are JS objects containing 'paths' and 'shim' values

* config - common configuration object containing config, bbrest and jxon, see lib/config docs

``` js
portalUtils.getRequireConfs(config)
.then(function(rjsconfs) {
    
});
```
### .getMasterTemplatePaths(config)
returns paths to .jsp templates used in master pages

* config - common configuration object containing config, bbrest and jxon, see lib/config docs

``` js
portalUtils.getMasterTemplatePaths(config)
.then(function(templates) {
    // templates will contain paths to template files
});
```

