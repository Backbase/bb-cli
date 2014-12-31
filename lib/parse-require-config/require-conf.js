requirejs.config({
    baseUrl: "/",
    waitSeconds: 60,
    paths: {
        propertyParser: "launchpad/support/requirejs/propertyParser",
        async: "launchpad/support/requirejs/async",
        goog: "launchpad/support/requirejs/goog",
        portal: "launchpad/lib/common/noDup",
        lp: "launchpad/lib/common/noDup",
        noConflict: "launchpad/lib/common/noDup",
        jquery: "launchpad/support/requirejs/require-jquery",
        "jquery-ui": "launchpad/support/jquery/jquery-ui.custom.min",
        angular: "launchpad/support/angular/angular.min",
        d3: "launchpad/support/d3/d3",
        r2d3: "launchpad/support/d3/r2d3",
        aight: "launchpad/support/d3/aight",
        "launchpad/support/angular-resource": "launchpad/support/angular-resource/angular-resource.min",
        "launchpad/support/hammer": "launchpad/support/hammerjs/hammer.min"
    },
    shim: {
        b$: {
            exports: "b$"
        },
        jquery: {
            exports: "jQuery"
        },
        d3: {
            exports: "d3"
        },
        r2d3: {
            deps: ["aight"],
            exports: "d3"
        },
        "jquery-ui": ["jquery"],
        "launchpad/lib/common/util": {
            deps: ["jquery"],
            exports: "lp.util"
        },
        "launchpad/lib/ui/responsive": {
            deps: ["jquery"],
            exports: "lp.responsive"
        },
        "launchpad/lib/common/rest-client": {
            deps: ["jquery"],
            exports: "lp.restClient"
        },
        angular: {
            exports: "angular"
        },
        "launchpad/support/angular-resource": ["angular"],
        "launchpad/support/angular/angular-ui-bootstrap": ["angular"],
        "launchpad/support/angular/angular-cache": ["angular"],
        "launchpad/support/angular/angular-ui-validate": ["angular"],
        "launchpad/support/angular/angular-gm": ["angular", "launchpad/support/requirejs/gmaps"],
        "launchpad/support/hammer": {
            exports: "Hammer"
        }
    },
    map: {
        "*": {
            d3: function(a, r) {
                "use strict";
                return document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1") ? a : r
            }("d3", "r2d3")
        }
    }
});