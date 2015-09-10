// returns id of the content folder
// if it doesn't exist it will create it
var _ = require('lodash');
var rp = require('request-promise');
var path = require('path');
var fs = require('fs');
var formattor = require('formattor');

// opts should contain instances of bbrest and jxon
module.exports = Cmis;

function Cmis(target, cfg, jxon) {
    this.path = target.path.split('/');
    this.type = target.type;
    this.mimeType = target.mimeType;
    if (this.type === 'bb:image') this.path.pop();
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
    // this.contentUrl = path.join(
    //     '/',
    //     this.config.context,
    //     'content/atom/contentRepository/content',
    //     this.path[this.path.length - 1]
    // );
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
            },
            headers: {
                'Content-Type': 'text/xml'
            }
        };
        if (content) opts.body = content;

        return rp(opts)
        .then(function(res) {
            if (!res) return;
            var jx;
            try {
                jx = that.jxon.stringToJs(res);
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
    getPath: function(pathIndex) {
        if (pathIndex === undefined) pathIndex = this.path.length - 1;
        else if (pathIndex < 0) throw new Error('CMIS Error wrong pathIndex, ' + pathIndex);
        var contentPath = this.path.slice(0, pathIndex + 1).join('/');

        if (this.idPromise[contentPath]) return this.idPromise[contentPath];

        var query = {
            path: contentPath || '/',
            includeAllowableAction: false
        };

        var that = this;
        return this.idPromise[contentPath] = this.request('get', 'path', query)
        .then(function(jx) {
            return that.parseGetPath(pathIndex, jx);
        })
        .catch(function(err) {
            return that.getPathError(pathIndex, err);
        });
    },
    getPathError: function (pathIndex, err) {
        // if 404, try getting previous folder
        if (err.code === 404) {
            return this.getPath(pathIndex - 1);
        }

        var contentPath = this.path.slice(0, pathIndex + 1).join('/');
        console.log('CMIS Error getting ' + contentPath, '\n', err);
        throw err;
    },
    parseGetPath: function(pathIndex, jx) {
        var props = jx['atom:entry']['cmisra:object']['cmis:properties'];
        var objectId = _.find(props['cmis:propertyId'], {$propertyDefinitionId: 'cmis:objectId'})['cmis:value'];

        // if full path exists, return parent id
        if (pathIndex === this.path.length - 1) {
            return objectId;
        } else {
            // otherwise create folder || content
            return this.create(pathIndex + 1, objectId);
        }
    },
    create: function(pathIndex, parentObjectId) {
        var query = {
            id: parentObjectId,
            overwriteFlag: true
        };
        var name = this.path[pathIndex];
        var type;
        var bodyArray = [];

        if (pathIndex === this.path.length - 1 && this.type === 'bb:richtext') {
            type = this.type;
            // doesn't work, relies on content-type. needs proper escape for mime type
            // bodyArray.push({type: 'id', id: 'cmis:contentStreamMimeType', value: this.mimeType});
        } else {
            type = 'cmis:folder';
            bodyArray.push({type: 'string', id: 'cmis:name', value: name});
        }
        bodyArray.push({type: 'id', id: 'cmis:objectTypeId', value: type});

        var body = getPostBody(name, bodyArray);
        body = formattor(this.jxon.jsToString(body), {method: 'xml'});

        var contentPath = this.path.slice(0, pathIndex + 1).join('/');
        console.log('CMIS creating ' + contentPath, type);

        var that = this;
        return this.request('post', 'children', query, body)
        .then(function(res) {
            return that.parseGetPath(pathIndex, res);
        })
        .catch(function(err) {
            console.log('CMIS Error creating ' + contentPath);
            throw err;
        });
    },
    importText: function(content) {
        var that = this;
        return this.getPath()
        .then(function(objectId) {
            var query = {
                id: objectId,
                overwriteFlag: true
            };
            return that.request('put', 'content', query, content)
            .then(function() {
                console.log('CMIS Text Import OK.', that.path.join('/'));
            })
            .catch(function(err) {
                console.log('CMIS Error Text Import', that.path.join('/'));
                throw err;
            });
        });
    },
    importImage: function(filePath) {
        var that = this;
        return this.getPath()
        .then(function() {
            return that.upload(filePath);
        });
    },
    upload: function(filePath) {
        // check if file exists first?
        var file = path.parse(filePath);
        var dir = this.path.join('/');
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
                targetPath: dir || '/',
                'cmis:createdBy': this.config.username,
                'cmis:lastModifiedBy': this.config.username,
                'cmis:objectTypeId': this.type,
                'bb:title': file.base,
                file: fs.createReadStream(filePath)
            }
        };
        return rp(opts)
        .then(function() {
            console.log('CMIS Upload OK.', path.join(dir, file.base));
        })
        .catch(function(err) {
            console.log('CMIS Error Upload', opts.formData);
            throw err;
        });
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
        parsedProp.$propertyDefinitionId = prop.id;
        var tag = 'cmis:property' + _.startCase(prop.type);
        if (jxProps[tag]) {
            if (!(jxProps[tag] instanceof Array)) jxProps[tag] = [jxProps[tag]];
            jxProps[tag].push(parsedProp);
        } else {
            jxProps[tag] = parsedProp;
        }
    });
    var out = {
        'atom:entry': {
            'atom:id': 'urn:uuid:' + itemName,
            'atom:title': itemName,
            'atom:updated': new Date().toISOString(),
            'cmisra:object': {
                'cmis:properties': jxProps,
                '$xmlns:ns3': 'http://docs.oasis-open.org/ns/cmis/messaging/200908/'
            },
            '$xmlns:atom': 'http://www.w3.org/2005/Atom',
            '$xmlns:cmis': 'http://docs.oasis-open.org/ns/cmis/core/200908/',
            '$xmlns:cmisra': 'http://docs.oasis-open.org/ns/cmis/restatom/200908/'
        }
    };
    return out;
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

/* Posting new text content on existing path
  <cmisra:content>
    <cmisra:mediatype>text/html; charset=utf-8</cmisra:mediatype>
    <cmisra:base64>PHA+YXNkZGE8L3A+</cmisra:base64>
  </cmisra:content>
  <cmisra:object xmlns:ns3="http://docs.oasis-open.org/ns/cmis/messaging/200908/">
    <cmis:properties>
      <cmis:propertyId propertyDefinitionId="cmis:createdBy">
        <cmis:value>admin</cmis:value>
      </cmis:propertyId>
      <cmis:propertyId propertyDefinitionId="cmis:lastModifiedBy">
        <cmis:value>admin</cmis:value>
      </cmis:propertyId>
      <cmis:propertyId propertyDefinitionId="cmis:objectTypeId">
        <cmis:value>bb:richtext</cmis:value>
      </cmis:propertyId>
    </cmis:properties>
  </cmisra:object>
*/
