console.log('This template uses Maven Archetypes, you might need to setup your credentials');

var DEFAULT_ARCHETYPE_VERSION = '1.0.1';
var DEFAULT_ARCHETYPE_GROUPID = 'com.backbase.launchpad';
var DEFAULT_ARCHETYPE_ARTIFACTID = 'launchpad-archetype-CXP5.6';

module.exports = function(bbscaff){
    bbscaff.prompt([
        {
            name: 'archetypeVersion',
            message: 'Launchpad Archetype Version (usually you don\'t have to change that)',
            default: DEFAULT_ARCHETYPE_VERSION
        },
        {
            name: 'groupId',
            message: 'groupId',
            'default': 'com.mycompany.project'
        },
        {
            name: 'artifactId',
            message: 'artifactId',
            'default': function(answers){
                return answers.groupId.split('.').pop();
            }
        },
        {
            name: 'version',
            message: 'version',
            'default': '1.0-SNAPSHOT'
        },

        {
            name: 'launchpad-edition',
            message: 'launchpad-edition',
            type: 'list',
            choices: ['retail', 'universal']
        },
        {
            name: 'launchpad-version',
            message: 'launchpad-version',
            default: '0.13.1'
        }
    ], function(answers){
        bbscaff.archetype(answers, {
            archetypeArtifactId: DEFAULT_ARCHETYPE_ARTIFACTID,
            archetypeGroupId: DEFAULT_ARCHETYPE_GROUPID
        }, function(){
            console.log('You can now $ cd ' + answers.artifactId);
        });
    });
};