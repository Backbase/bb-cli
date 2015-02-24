# BB-CLI Archetype

Providing a simple way to install Backbase Archetypes.

## Create a new portal from Maven Archetype

By typing a simple command you can now check out a new `mvn archetype` simply by executing the command:

    bb archetype

## Introduction

When you run the command `bb archetype` you get a few questions before the main command for `mvn archetype` will be executed. The questions you will get are:


### 1. "Choose the archetype you wish to install:"

You can choose which archetype you want to install by choosing from the list. The list is dynamically pulled from __repo.backbase.com__ and lists the archetypes available from repo `com.backbase.expert.tools` and only those prepended with `backbase-..`.

```
? Choose the archetype you wish to install: (Use arrow keys)
  backbase-all-in-one-archetype
  backbase-all-in-one-launchpad-archetype
  backbase-contentservices-archetype
❯ backbase-es-project-archetype
  backbase-launchpad-archetype
  backbase-mashupservices-archetype
  backbase-orchestrator-archetype
(Move up and down to reveal more choices)
```

Which results in the following answer review:

```
? Choose the archetype you wish to install: backbase-es-project-archetype
```

### 2. "Which version do you want to install?"

After having selected an archetype to install you will get a list of versions available for that archetype. These versions are taken from the `maven-metadata.xml` and displays all those listed as `latest` and those available in the `versions` list.

```
...
? Which version do you want to install? (Use arrow keys)
❯ 5.5.1.1
  5.5.0.0
```

Which results in the following answer review:

```
? Which version do you want to install? 5.5.1.1
```

### 3. "Is the above information correct?"

When you've completed all questions you will get a confirmation question asking if all the information chosen before is correct. Available options to choose as an snwer here are a simple `Y` or `n`.

Choosing `Y` here will trigger the `mvn archetype:generate` command to run:

```
...
? Is the above information correct? Yes
Initiating 'mvn archetype' command...
[INFO] Scanning for projects...
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] Building Maven Stub Project (No POM) 1
[INFO] ------------------------------------------------------------------------
[INFO]
[INFO] >>> maven-archetype-plugin:2.2:generate (default-cli) @ standalone-pom >>>
[INFO]
...
```
