# Mowa CLI

Mowa CLI is set of tools to assist application development with Mowa framework.

##1. Usage

	Usage: mowa [cli module] <command> [--env=<target environment>] [--target=<target web module>]

    Options:
  	-e, --env  target environment                        [default: "development"]
  	-t, --target  only process specified target web module

The default cli module is "default" if the cli module paramter is not given. All cli module has a "help" command showing all supported commands of the module.

##2. Configuration

Mowa CLI reads settings from server configuration file (by default, it's the "server.<env>.json" files in the etc folder).

    "settings": {
        "cli": {
            "general": {
                "consoleEnabled": true,
                "consoleLogLevel": "verbose",
                "consoleLogColorize": true,
                "fileLogEnabled": true,
                "fileLogLevel": "verbose",
                "fileLogFilename": "mowa-cli.log",
                "fileLogOverwrite": true,
                "verbose": true
            }
        }
    }

##3. CLI Modules

###3.1 "default" Module

"default" module provides commands to initiate a new mowa project.

#### init

    mowa default init

Run this command in a empty folder to initiate a new mowa project.

## License

  MIT

## Latest version

  0.0.3
