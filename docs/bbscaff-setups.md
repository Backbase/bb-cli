# .bbscaff directory setups

> Adding Templates to bb-cli

### Methods

#### Symbolic Link .bbscaff

> This allows creation of a templates folder in a development directory. It uses symbolic links to create .bbscaff folder

1. Create a templates folder in your desired directory: (I'll use projects)

    `cd ~/projects`

    `mkdir templates`

2. Link templates to the $HOME directory, name the link .bbscaff:

    `ln -s ~/projects/templates ~/.bbscaff`

3. When creating new templates, create a new directory with the name of the template:

    `cd ~/projects/templates && mkdir bb-test-template`

    `cd bb-test-template`

4. Create template folder to be used, and bbscaff.js:

    `mkdir template`

    `touch bbscaff.js`

5. Check that your template is available when running bb generate, bb-test-template should be shown in the table:

    `bb generate`

6. Add base code for bbscaff.js:

    * Open bbscaff.js in your editor of choice
    * Add the below to the file and save it:

        `module.exports = function(bbscaff){};`

7. Now specifying the template on the cli should work without errors:

    `bb generate bb-test-template`

8. Refer to [generate.md](generate.md) for creating template and configuring bbscaff.js

#### Symbolic Link Specific Templates to .bbscaff Directory

> Similar to above method, however seperates the .bbscaff directory from the templates

1. Create .bbscaff directory in $HOME

    `mkdir ~/.bbscaff`

2. Create a templates folder in the desired directory: (I'll use projects)

    `mkdir ~/projects/templates`

3. Create a new template folder with the desired template name:

    `cd ~/projects/templates`

    `mkdir bb-test-widget`

4. Link the new templates directory to .bbscaff

    `ln -s ~/projects/templates/bb-test-widget ~/.bbscaff/bb-test-widget`

5. CD into the new templates directory the follow 4 - 8 in Symbolic Link .bbscaff

