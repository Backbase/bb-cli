var fs = require('fs');
var path = require('path');
var bbscaff = require('../lib/bbscaff');
var checkBitbucketConnectivity = require('../lib/checkBitbucketConnectivity');
var updateFilePath = path.join(__dirname, '..', 'update.json');

var isUpdateDecisionPersisted = function () {
    try {
        require(updateFilePath);
        console.log('file exist');
        return true;
    }
    catch (e) {
        return null;
    }
};

var getUpdateDecision = function () {
    if (isUpdateDecisionPersisted()) {
        var json = require(updateFilePath);
        return json.decision;
    }
    return null;
};

module.exports = function (repo, target, forceUpdate) {
    function updateTemplate() {
        console.log('Using last template version.');
        return bbscaff.fetchTemplate(repo, target);
    }

    return checkBitbucketConnectivity()
        .then(
            function () {
                if (!forceUpdate) {
                    var decision = getUpdateDecision();
                    if (decision === null) {
                        return bbscaff.prompt([
                                {
                                    type: 'input',
                                    name: 'update',
                                    message: 'There is connectivity available to download a new version of the template. Do you want to update it?',
                                    default: 'N'
                                },
                                {
                                    type: 'input',
                                    name: 'persist',
                                    message: 'Do you want to remember your decision to not be asked again?',
                                    default: 'Y'
                                }
                            ])
                            .then(
                                function (input) {
                                    if (input.persist.toUpperCase() === 'Y') {
                                        fs.writeFileSync(updateFilePath, JSON.stringify({decision: input.update.toUpperCase() !== 'N'}));
                                    }
                                    if (input.update.toUpperCase() !== 'N') {
                                        return updateTemplate();
                                    }
                                }
                            );
                    } else {
                        if (decision === true) {
                            return updateTemplate();
                        }
                        return;
                    }
                } else {
                    return updateTemplate();
                }

            }
        );
};
