var _ = require('lodash');
var request = require('request-promise');

var bbrest, jxon, url;

module.exports = function(entries) {
        var o = {};
        parseEntry(entries.contentEntry, o);
        return o;
};

function parseEntry(entry, o) {
    if (_.isArray(entry)) {
        _.each(entry, function(ent) {
            parseEntry(ent, o);
        });
    } else {
        o[entry.key] = parseContent(entry.content.entry);
    }
}

function parseContent(content) {
    var o = {};
    _.each(content, function(unit) {
        if (unit.value) {
            var keySplit = unit.key.split(':');
            if (keySplit.length > 1) {
                if (!o[keySplit[0]]) o[keySplit[0]] = {};
                o[keySplit[0]][keySplit[1]] = unit.value;
            } else {
                o[unit.key] = unit.value;
            }
        }
    });
    return o;
}

function setRichText(id, content) {
    return sendContent('POST', id, 'children', content)
    .then(function() {
        return sendContent('POST', id, 'children', content)
    })

}

function sendContent(method, id, thing, content) {
    var opts = {
        method: method,
        uri: url + thing,
        qs: {
            id: id,
            overwriteFlag: true
        },
        body: content,
        auth: {
            username: bbrest.config.username,
            password: bbrest.config.password
        }
    };
    getCmisContent();
    return;
    return request(opts)
    .then(function(res) {
        console.log(res);
    })
    .catch(function(err) {
        console.log(err);
    });
}

