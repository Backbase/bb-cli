console.log('This template uses Maven Archetypes, you might need to setup your credentials');

module.exports = function(bbscaff){
    bbscaff.prompt([
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
        }


    ], function(answers){
        bbscaff.archetype(answers, {
            archetypeArtifactId: 'launchpad-archetype-CXP5.6',
            archetypeGroupId: 'com.backbase.launchpad',
            archetypeVersion: '1.0.0-RC'
        }, function(){
            console.log('You can now $ cd ' + answers.artifactId);
        });
    });
};