var url = require('url');
var _ = require('lodash');
var config = require('./config');

var request = require('request-promise');
var soap = require('soap-as-promised');

var defaultRuntime = 'http://localhost:8086/forms-runtime';
var defaultStudio = 'http://admin:welcome@localhost:8093';
var serviceEndpointWSDL = '/Services/ManagementService?singleWsdl';
var restEndpoint = '/api/v1';

module.exports = {
    getConfig: function (opt) {
        return config.getBbRc().then(function (bbrc) {
            return _.merge({
                runtime: defaultRuntime,
                studio: defaultStudio
            }, bbrc.forms, opt);
        });
    },
    getRuntimeClient: function(opt){
        return this.getConfig(opt)
            .then(function(config){
                var runtime = url.parse(config.runtime);
                var credentials = runtime.auth ? runtime.auth.split(':') : [];
                if (credentials.length !== 2){
                    throw new Error('Please specify studio login credentials.');
                }

                var client = request.defaults({
                        baseUrl: 'http://' + runtime.hostname + ':' + runtime.port + runtime.pathname  + restEndpoint,
                        json: true
                    });

                return client
                    .post('/oauth/token')
                    .qs({grant_type: 'client_credentials'})
                    .auth(credentials[0], credentials[1])
                    .json(true)
                    .then(function(token){
                        //perform API call
                        return client.defaults({
                            auth: {
                                bearer: token.access_token
                            }
                        });
                    });
            });
    },
    getClient: function (opt) {
        return this.getConfig(opt).then(function(config){
            var studio = url.parse(config.studio);
            var credentials = studio.auth ? studio.auth.split(':') : [];
            if (credentials.length !== 2) {
                throw new Error('Please specify studio login credentials.');
            }

            return soap.createClient('http://' + studio.hostname + ':' + studio.port + studio.pathname + serviceEndpointWSDL).then(function (client) {
                client.setSecurity(new soap.BasicAuthSecurity(credentials[0], credentials[1]));
                return client;
            });
        });
    },
    options: {
        repository: {
            type: 'string',
            alias: 'r'
        },
        project: {
            type: 'string',
            alias: 'p'
        },
        branch: {
            type: 'string',
            alias: 'b'
        },
        studio: {
            type: 'string',
            alias: 'sH'
        },
        runtime: {
            type: 'string',
            alias: 'rH'
        }
    }
};
