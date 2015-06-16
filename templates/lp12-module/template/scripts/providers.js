define(function(require, exports, module) {

    'use strict';

    // @ngInject
    exports.lpSample = function() {

        this.method = function() {};

        // @ngInject
        this.$get = function($http, lpCoreUtils) {

            var config = {
                endpoint: '/default'
            };

            function API() {
                if( !this instanceof API) { return new API(); }
                this.prop = 'some-prop';
            }

            lpCoreUtils.assign(API.prototype, {
                get: function() {
                    return $http.get(config.endpoint);
                }
            });

            return {
                setConfig: function(options) {
                    config = lpCoreUtils(options).chain()
                        .mapValues(lpCoreUtils.resolvePortalPlaceholders)
                        .defaults(config)
                        .value();
                    return this;
                },

                getConfig: function(prop) {
                    if (prop && lpCoreUtils.isString(prop)) {
                        return config[prop];
                    } else {
                        return config;
                    }
                },

                api: function() {
                    return new API();
                }
            };
        };
    };

    // @ngInject
    exports.lpSampleResource = function() {

        this.method = function() {

        };

        // @ngInject
        this.$get = function($resource, lpCoreUtils) {

            var config = {
                endpoint: '/default'
            };

            function API() {
                var Rest = $resource(config.endpoint, {}, {
                    getAll: {}
                });

                lpCoreUtils.assign(Rest.prototype, {
                    getAll: function() {

                    }
                });

                return Rest;
            }
            return {
                setConfig: function(options) {
                    config = lpCoreUtils(options).chain()
                        .mapValues(lpCoreUtils.resolvePortalPlaceholders)
                        .defaults(config)
                        .value();
                    return this;
                },

                getConfig: function(prop) {
                    if (prop && lpCoreUtils.isString(prop)) {
                        return config[prop];
                    } else {
                        return config;
                    }
                },

                api: API
            };
        };
    };
});
