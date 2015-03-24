var Command = require('ronin').Command;
var Q = require('q');
var fs = require('fs-extra');
var readFile = Q.denodeify(fs.readFile);
var outputFile = Q.denodeify(fs.outputFile);
var ask = Q.denodeify(require('asking').ask);
var HOME = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
var seq = [searchConfig, askName, askEmail, writeConfig];

module.exports = Command.extend({
    desc: 'Backbase CLI configuration',

    run: function () {
        seq.reduce(Q.when, Q({}))
        .fail(function(p) {
            console.log('fail', p);
        })
        .done();
    }
});

function askName(r) {
    return ask('Your name:', r.name || undefined)
    .then(function(name) {
        if (name === '') {
            console.log('Wrong input.');
            return askName(r);
        }
        r.name = name;
        return r;
    });
}

function askEmail(r) {
    return ask('Your email:', r.email || undefined)
    .then(function(email) {
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            console.log('Wrong email.');
            return askEmail(r);
        }
        r.email = email;
        return r;
    });
}

function writeConfig(o) {
    return outputFile(HOME + '/.backbase/bb-cli.json', JSON.stringify(o))
    .then(function() {
        console.log(o);
        console.log('bb-cli global configuration saved at ~/.backbase/bb-cli.json');
    });
}

function searchConfig() {
    // read data from git
    var r = {};
    return readFile(HOME + '/.backbase/bb-cli.json')
    .then(function(d) {
        var s = JSON.parse(d.toString());
        for (var k in s) s[k] = {default: s[k]};
        return s;
    })
    .fail(function() {
        return searchGitConfig(r);
    });

}

function searchGitConfig(r) {
    return readFile(HOME + '/.gitconfig')
    .then(function(d) {
        var s = d.toString();
        var lines = s.split('\n');
        var l;
        var i;
        for (i = 0; i < lines.length; i++) {
            l = lines[i].trim();
            if (l.substr(0, 4) === 'name') r.name = {default: l.substring(l.indexOf('=') + 1).trim()};
            else if (l.substr(0, 5) === 'email') r.email = {default: l.substring(l.indexOf('=') + 1).trim()};
        }
        return r;
    })
    .fail(function() {
        return r;
    });
}
