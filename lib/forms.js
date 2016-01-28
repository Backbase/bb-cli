var _ = require('lodash');
var soap = require('soap-as-promised');
var config = require('./config');

var serviceEndpointWSDL = '/Services/ManagementService?singleWsdl';

module.exports = {
    getConfig: function (opt) {
        return config.getBbRc().then(function (bbrc) {
            return _.merge({
                host: 'localhost',
                port: '8093',
                context: '',
                username: 'admin',
                password: 'welcome'
            }, bbrc.forms, opt);
        });
    },
    getClient: function (config) {
        return soap.createClient('http://' + config.host + ':' + config.port + config.context + serviceEndpointWSDL).then(function(client){
            client.setSecurity(new soap.BasicAuthSecurity(config.username, config.password));
            return client;
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
        host: {
            type: 'string',
            alias: 'H'
        },
        port: {
            type: 'string',
            alias: 'P'
        },
        context: {
            type: 'string',
            alias: 'c'
        },
        username: {
            type: 'string',
            alias: 'u'
        },
        password: {
            type: 'string',
            alias: 'x'
        }
    }
};
