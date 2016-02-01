var path = require('path');
var repos = require('../templates/repos.json');
var updateTemplatesOnDemand = require('./updateTemplatesOnDemand');

var templatesDir = path.join(__dirname, '..', 'templates');

var key;

for (key in repos) {
    if (repos.hasOwnProperty(key)) {
        updateTemplatesOnDemand(repos[key], path.join(templatesDir, key), true);
    }
}
