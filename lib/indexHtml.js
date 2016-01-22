var fs = require('fs-extra-promise');
var _ = require('lodash');
var formattor = require('formattor');
var jxon = require('jxon');

module.exports = function(filePath, dist) {
    return read(filePath)
    .then(function(str) {
        return setDist(str, dist);
    });
};

function read(filePath) {
    var that = this;
    return fs.readFileAsync(filePath)
    .then(function(buffer) {
        return buffer.toString();
    });
}

function setDist(str, dist) {
    var jx = jxon.stringToJs(str);
    var onload = jx.html.body['$g:onload'];
    var re = /'\s*(.*?)\s*'/;
    var replace = '\'' + (dist ? 'dist/' : '') + 'scripts/main\'';
    jx.html.body['$g:onload'] = onload.replace(re, replace);
    return '<!DOCTYPE html>\n' + formattor(jxon.jsToString(jx), {method: 'xml'});
}
