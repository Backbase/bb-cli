var path = require('path');
var fs = require('fs');
var Q = require('q');

var walk = {
    walker: function (dir) {
        return {
            run: function run(directory) {
                directory = directory || dir;
                var deferred = Q.defer();

                fs.readdir(directory, function (err, list) {
                    var pending = list.length;
                    console.log(pending);
                    if (err) {
                        deferred.reject(err);
                    }

                    if (!pending) {
                        deferred.resolve();
                    }

                    list.forEach(function (file) {
                        file = path.resolve(directory, file);
                        fs.stat(file, function (err, stat) {
                            deferred.notify({
                                stat: stat,
                                file: file,
                                list: list
                            });
                            if (stat && stat.isDirectory()) {
                                if (!--pending) {
                                    deferred.resolve();
                                } else {
                                    run(file);
                                }
                            } else {
                                if (!--pending) {
                                    deferred.resolve();
                                }
                            }
                        });
                    });
                });
                return deferred.promise;
            }
        };
    }
};

module.exports = walk;
