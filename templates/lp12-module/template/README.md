# <%=module_title%>

<%=module_description%>

*Modules are reusable components/libraries accross multiple widgets*


#Information
| name                  | version       | bundle     |
| ----------------------|:-------------:| ----------:|
| <%=module_name %>     | <%=module_version%>        | launchpad  |

#Module Checklist

 - [ ] Testing: Distribution folder


##Dependencies
* [base][base-url]
* [core][core-url]
* [ui][ui-url]



## Table of Contents

- [Configure](#config)
- [Provider](#provider)
- [Utils](#utils)
- [Mock Api Server](#api)
- [Test](#test)
- [Build](#build)
- [Resources](#resources)



##<a name="config"></a> Configure

Configure the module, for example 3rd party modules configuration or core modules configuration.

AngularJS uses $provide to register new providers. The providers basically create new instances, but only once for each provider. The $provide has six methods to create custom providers and I will explain each one of them with the help of sample code. These providers are available on $provide:


*main.js*

```
module.name = 'module-ng-sample';

var base = require('base');
var core = require('core');
var ui = require('ui');

var deps = [
    core.name,
    ui.name
];

module.export = base.createModule(module.name, deps)
    .config( require('./config') )
    .constant( require('./utils') )
    .value('movieTitle', 'The Matrix')
    .provider( require('./provider') )



```



*utils.js*

```

// @ngInject
exports.lpSampleUtils = function(lpCoreUtils) {

};

// or

lpSampleUtils = {};
lpSampleUtils.mySuperUtility = function mySuperUtility() {
    //
};
module.exports = lpSampleUtils;

```


*provider.js*

```
'use strict';
// @ngInject
exports.lpSample = function() {

    this.method = function () { };
    // @ngInject
    this.$get = function () { return {};  };

};
```

Angular default providers

###Constant

A constant can be injected everywhere. A constant can not be intercepted by a decorator, that means that the value of a constant can never be changed.

###Value

A value is nothing more than a simple injectable value. The value can be a string, number but also a function. Value differs from constant in that value can not be injected into configurations, but it can be intercepted by decorators.

###Service

A service is an injectable constructor. If you want you can specify the dependencies that you need in the function. A service is a singleton and will only be created once by AngularJS. Services are a great way for communicating between controllers like sharing data.

###Factory

A factory is an injectable function. A factory is a lot like a service in the sense that it is a singleton and dependencies can be specified in the function. The difference between a factory and a service is that a factory injects a plain function so AngularJS will call the function and a service injects a constructor. A constructor creates a new object so new is called on a service and with a factory you can let the function return anything you want. As you will see later on, a factory is a provider with only a $get method.

###Decorator

A decorator can modify or encapsulate other providers. There is one exception and that a constant cannot be decorated.

###Provider

A provider is the most sophisticated method of all the providers. It allows you to have a complex creation function and configuration options. A provider is actually a configurable factory. The provider accepts an object or a constructor.

All modules have the following prefix style for example let say the **module-accounts** :
- lpAccounts (provider/api)
- lpAccountsUtils (constant utility so it can be used also in configurations)
- lpAccountsModel (service api for the account model data)
- lpAccountsFinancial (factory can be some external lib )

###Commponents sample:
They can be composed from the main ui library:

```
<lp-select-accounts><lp-select-accounts>

```


where **lp-select-accounts** is the directive inside the module components folder
- components
    - select-accounts
        +   lp-select-accounts
        +   lp-select-account-option
        +   ...etc

** please reffer to the [ui][ui-url] or  sample widget to check the component folder structure**

##<a name="test"></a> Test

```
npm run test
```


##<a name="build"></a> Build

```
npm run build
```


#### DO NOT FORGET TO TEST THE DIST FOLDER BEFORE PUBLISHING
check [config README][config-url] file


##<a name="resources"></a> Resources

- [AngularJS - Providers](https://thinkster.io/egghead/providers)
- [Lodash](https://lodash.com/docs)


[base-url]:http://stash.backbase.com:7990/projects/lpm/repos/foundation-base/browse/
[core-url]: http://stash.backbase.com:7990/projects/lpm/repos/foundation-/browse/
[ui-url]: http://stash.backbase.com:7990/projects/lpm/repos/ui/browse/
[config-url]: http://stash.backbase.com:7990/projects/LP/repos/widget-config-sample/browse/
[api-url]:http://stash.backbase.com:7990/projects/LPM/repos/api/browse/
