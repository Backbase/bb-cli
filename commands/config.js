var Command = require('ronin').Command,
    Q = require('q'),
    fs = require('fs'),
    readFile = Q.denodeify(fs.readFile),
    writeFile = Q.denodeify(fs.writeFile),
    ask = Q.denodeify(require('asking').ask),
    HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
    seq = [searchConfig, askName, askEmail, writeConfig];

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
    return writeFile(HOME + '/.backbase/config.json', JSON.stringify(o))
    .then(function() {
        console.log(o);
        console.log('Configuration saved.');
    });
} 

function searchConfig() {
    // read data from git
    var r = {};
    return readFile(HOME + '/.backbase/config.json')
    .then(function(d) {
        var s = JSON.parse(d.toString());
        for (var k in s) s[k] = {default: s[k]};
        return s;
    })
    .fail(function(p) {
        return searchGitConfig(r);
    });

}
function searchGitConfig(r) {
    return readFile(HOME + '/.gitconfig')
    .then(function(d) {
        var s = d.toString(),
            lines = s.split('\n');
        for (var l, li, i = 0; i < lines.length; i++) {
            l = lines[i].trim();
            if (l.substr(0, 4) === 'name') r.name = {default: l.substring(l.indexOf('=') + 1).trim()};
            else if (l.substr(0, 5) === 'email') r.email = {default: l.substring(l.indexOf('=') + 1).trim()};
        }
        return r;
    })
    .fail(function(p) {
        return r;
    });
}
