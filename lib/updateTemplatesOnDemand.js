var bbscaff = require('../lib/bbscaff');
var checkBitbucketConnectivity = require('../lib/checkBitbucketConnectivity');

module.exports = function (repo, target, forceUpdate) {
    function updateTemplate() {
        console.log('Updating template from repo (' + repo + ') in ' + target);
        return bbscaff.fetchTemplate(repo, target);
    }

    return checkBitbucketConnectivity()
        .then(
            function () {
                if (!forceUpdate) {
                    return bbscaff.prompt([
                            {
                                type: 'input',
                                name: 'update',
                                message: 'There is connectivity available to download a new version of the template. Do you want to update it?',
                                default: 'N'
                            }
                        ])
                        .then(
                            function (input) {
                                if (forceUpdate || input.update.toUpperCase() !== 'N') {
                                    return updateTemplate();
                                }
                            }
                        );
                } else {
                    return updateTemplate();
                }

            }
        );
};
