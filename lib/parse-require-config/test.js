var transform = require('./index.js');
var fs = require('fs');

var raw = fs.readFileSync('./require-conf.js', 'utf-8');

transform.modifyConfig(raw, function (config) {
    console.log('config', config);
});