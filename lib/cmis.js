// returns id of the content folder
// if it doesn't exist it will create it
var _ = require('lodash');
var rp = require('request-promise');
var path = require('path');
var fs = require('fs');

// opts should contain instances of bbrest and jxon
module.exports = Cmis;

function Cmis(target, cfg, jxon) {
    this.portalName = target.portal;
    this.pageName = target.page;
    this.itemName = target.item;
    // promise that resolves to this item id
    this.idPromise = {};

    this.config = {
        protocol: 'http',
        host: 'localhost',
        port: 7777,
        context: 'portalserver',
        username: 'admin',
        password: 'admin'
    };
    if (cfg) _.assign(this.config, cfg);

    this.baseUrl = path.join(
        this.config.host + ':' + this.config.port,
        this.config.context,
        '/content/'
    );
    this.repoUrl = path.join(this.baseUrl, 'atom/contentRepository');
    this.jxon = jxon;
}

_.assign(Cmis.prototype, {
    request: function(method, cmd, query, content) {
        var that = this;
        var opts = {
            method: method,
            proxy: 'http://localhost:8080',
            url: this.config.protocol + '://' + path.join(this.repoUrl, cmd),
            qs: query,
            auth: {
                username: this.config.username,
                password: this.config.password
            }
        };
        if (content) opts.body = content;

        return rp(opts)
        .then(function(res) {
            if (!res) return;
            try {
                var jx = that.jxon.stringToJs(res);
            }
            catch(err) {
                console.log('Problem when parsing response body');
                var out = {
                    code: 'JXON',
                    message: err.toString(),
                    href: opts.url + '?' + opts.qs
                };
                throw out;
            }
            return jx;
        })
        .catch(function(err) {
            if (err.response) {
                throw {
                    code: err.response.statusCode,
                    message: err.response.statusMessage,
                    href: err.response.request.href
                };
            }
            throw err;
        });
    },
    getQueryString: function(cmd, key, query) {
        var robj = query || {};
        if (cmd === 'path') {
            var pth = ['/Generated content'];
            switch (key) {
                case '$portal':
                    pth.push(this.portalName);
                    break;
                case '$page':
                    pth.push(this.portalName, this.pageName);
                    break;
                case '$item':
                    pth.push(this.portalName, this.pageName, this.itemName);
                    break;
                default:
                    pth.push(this.portalName, this.pageName, this.itemName, key);
                    break;
            }
            robj.path = path.join.apply(null, pth);
            robj.includeAllowableAction = false;
        } else {
            robj.overwriteFlag = true;
        }

        return robj;
    },
    getPath: function(key, cont) {
        if (this.idPromise[key]) return this.idPromise[key];
        var that = this;
        var query = this.getQueryString('path', key);
        this.idPromise[key] = this.request('get', 'path', query)
        .then(function(jx) {
            return that.parseGetPath(key, cont, jx);
        })
        .catch(function(err) {
            return that.getPathError(key, cont, err);
        });
        return this.idPromise[key];
    },
    parseGetPath: function(key, cont, jx) {
        var props = jx['atom:entry']['cmisra:object']['cmis:properties'];
        var objectId = _.find(props['cmis:propertyId'], {'$propertyDefinitionId': 'cmis:objectId'})['cmis:value'];

        if (key.charAt(0) === '$') {
            var nextKey, name, type;
            if (key === '$item') {
                nextKey = cont.key;
                name = cont.key;
                type = cont.type;
            } else {
                nextKey = this.getQueue(key, 'next');
                name = this[key.slice(1) + 'Name'];
                type = 'cmis:folder';
            }
            return this.create(nextKey, name, type, objectId, cont);
        } else {
            return objectId;
        }
    },
    create: function(key, name, type, objectId, cont) {

        var body = getPostBody(name, [
            {type: 'id', id: 'objectTypeId', value: type},
            {type: 'string', id: 'name', value: name}
        ]);

        var query = this.getQueryString('children', key, {id: objectId});

        var that = this;
        return this.request('post', 'children', query, this.jxon.jsToString(body))
        .then(function(res) {
            return that.parseGetPath(key, cont, res);
        });
    },
    getPathError: function (key, cont, err) {
        if (err.code === 404) {
            var prevKey = this.getQueue(key, 'prev');
            if (!cont.key) cont.key = key;
            return this.getPath(prevKey, cont);
        }
        console.log(key, err);
        throw err;
    },
    getQueue: function(key, what) {
        if (key === '$item' && what === 'next') return;
        else if (key === '$portal' && what === 'prev') throw new Error('CMIS Error: No queue before $portal');

        var queue = ['$portal', '$page', '$item'];
        var index = queue.indexOf(key);

        if (index === -1) {
            if (what === 'next') throw new Error('CMIS Error: End of queue for key: ' + key);
            else return '$item';
        }

        if (what === 'next') return queue[index + 1];
        else if (what === 'prev') return queue[index - 1];
    },
    importText: function(key, content) {
        var that = this;
        return this.getPath(key, {type: 'bb:richtext'})
        .then(function(id) {
            var query = that.getQueryString('content', key, {id: id});
            return that.request('put', 'content', query, content);
        });
    },
    importImage: function(key, filePath, cmisPath) {
        var that = this;
        console.log('upload ' + key);
        return this.getPath(key, {type: 'bb:image'})
        .then(function(id) {
            console.log('do upload ' + id);
        });
    },
    // localDir - dir of file in export zip
    upload: function(filePath, cmisPath) {
        // check if file exists first?
        var file = path.parse(filePath);
        var cmis = path.parse(cmisPath);
        var opts = {
            method: 'post',
            url: this.config.protocol + '://' + path.join(this.baseUrl, 'upload/form'),
            proxy: 'http://localhost:8080',
            auth: {
                username: this.config.username,
                password: this.config.password
            },
            formData: {
                name: file.base,
                targetPath: cmis.dir,
                'cmis:createdBy': this.config.username,
                'cmis:lastModifiedBy': this.config.password,
                'cmis:objectTypeId': 'bb:image',
                'bb:title': file.base,
                file: fs.createReadStream(filePath)
            }
        };
        var that = this;
        return rp(opts);

    }
});


// props - collection of objects with keys: type, id, value
// ex: {type: 'id', id: 'objectTypeId', value: 'cmis:folder'}
// ex: {type: 'string', id: 'name', value: 'widget-advanced-content-8045103'}
function getPostBody(itemName, props) {
    var jxProps = {};
    _.each(props, function(prop) {
        var parsedProp = {};
        parsedProp['cmis:value'] = prop.value;
        parsedProp['$propertyDefinitionId'] = 'cmis:' + prop.id;
        jxProps['cmis:property' + _.startCase(prop.type)] = parsedProp;
    });
    return {
        'atom:entry': {
            'atom:id': 'urn:uuid:' + itemName,
            'atom:title': itemName,
            'atom:updated': '2015-09-01T15:53:33Z',
            'cmisra:object': {
                'cmis:properties': jxProps,
                '$xmlns:ns3': 'http://docs.oasis-open.org/ns/cmis/messaging/200908/'
            },
            '$xmlns:atom': 'http://www.w3.org/2005/Atom',
            '$xmlns:cmis': 'http://docs.oasis-open.org/ns/cmis/core/200908/',
            '$xmlns:cmisra': 'http://docs.oasis-open.org/ns/cmis/restatom/200908/'
        }
    };
}

/*
POST http://localhost:7777/portalserver/content/upload/form

name                 B9349793EA2433B052863309394D6A63819E9F80260907AD78pimgpsh_fullsize_distr.jpg
targetPath           /
cmis:createdBy       admin
cmis:lastModifiedBy  admin
cmis:objectTypeId    bb:image
bb:title             B9349793EA2433B052863309394D6A63819E9F80260907AD78pimgpsh_fullsize_distr.jpg
file
*/
