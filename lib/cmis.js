var _ = require('lodash');

module.exports = {
    parse: function(entries) {
        var o = {};
        parseEntry(entries.contentEntry, o);
        return o;
    }
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
