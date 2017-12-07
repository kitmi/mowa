# Mowa

  A full-stack (aimed to be full-stack) **mo**dular **w**eb **a**pplication framework based on koa. (ES6 required)

## 1. Mowa Concepts

### Server
A mowa server is a standalone node server acting as a hosting container for Mowa applications. It mounts applications to configured routes either under the same hostname or different hostnames. A server will dispatch a http request to hosted applications according to the server routing settings. It may have server-wide middlewares touching every requests before dispatching them to the right application.

### Application
A mowa application is a web module hosted by a mowa server. It mounts controllers or middlewares to configured routes. Currenlty, an application is not running in a totally separate sandbox in the hosting environment.

### Controller
A mowa controller is a plain object exported by a JavaScript module containing several actions to handle web requests and response to the reqeusting client.

### Action
A mowa action is a koa-styled action which is a generator and handles one client request at a time. Besides all the koa context, the code in a mowa action can also access the appModule object which represents the instance of the application.

	function* (next) {
    	...
    }

### Feature
A feature is a configuratin-driven functional module of the server or an application. Built-in features include bootstrap, loggers, middlewares, koa, routing, i18n, and etc. Every feature is a top-level config item in the server configuraiton file or application configuration file.

### Starting Phrase

The starting of a server or an application include 5 consecutive phrases:
1). Initial Phrase
2). Service Registration Phrase
3). Engine Configuration Phrase
4). Middleware Registration Phrase
5). Routing Configuration Phrase (The starting process of an application starts within the server's routing configuration phrase)

A feature mentioned above is designed to be activated in a certain phrase which is specified in the feature definition file.

### Middleware
A mowa middleware actually should be called a middleware factory. It is a function creating a koa-styled middleware. The middleware factory can be configured in the section of "middlewares" feature of the configuration file or as an option in the setting of a certain router.

### Router
TBD.

### Oolong
Oolong is an embeded domain specific language (DSL) in mowa. The oolong dsl engine will build database scripts, database access models and data-related UI according to oolong entity definition files. It also shipped with a CLI tool to do automatic deployment of the database structure.

## 2. Project Structure

* **/etc** - server or application configuration files
* **/client** - client-side source code
* **/server** - server-side source code
	* **/server/bootstrap** - default path of bootstrap scripts (if boot feature is enabled in server or application config)
	* **/server/models** - backend model files
	* **/server/controllers** - backend controller files
	* **/server/views** - backend view files
* **/app_modules** - child applications
* **/server/db_scripts** - database initial scripts including test data
* **/oolong** - oolong entity definition files
* **/public** - default path of static files (if serveStatic middleware is enabled)
* **/middlewares** - middlewares extension
* **/features** - features extension


## 3. Get Started

### Configurations

#### 1) Server Configuration

* Environment specific configuration
	* /etc/server.default.json
	* /etc/server.development.json - Development specific configuration, overrides server.default.js
	* /etc/server.production.json - Production specific configuration, overrides server.default.json

#### 2) App Module Configuration

* Environment specific configuration
	* /app_modules/`<module name>`/etc/app.default.json
	* /app_modules/`<module name>`/etc/app.development.json - Development specific configuration, overrides app.default.json
	* /app_modules/`<module name>`/etc/app.production.json - Production specific configuration, overrides app.default.json

#### 3) Feature Configuration
* Each top-level key-value pair in the configuration file is the config of a feature, e.g. loggers, koa, mysql
	* Key is the feature name
	* Value is the feature's own config

## 4. Built-in Features

### Bootstrap

Specify a path containing scripts to be executed during initial phrase. 

Options:

	[path] - Bootstrap scripts path, default: ./server/bootstrap

## 5. Convention

### Design by contract

Refer to: https://github.com/codemix/babel-plugin-contracts

### Action
* this context
    * appModule - the webModule instance
    * viewState - the default view state for view renderer
    	* _module - module related state
    		* basePath
    		* serverUrl
    		* currentUrl
    	* _util - helper functions to be used during view rendering
    		* makePath(relativePath, query)
    		* makeUrl(relativePath, query)
* events
    * actionCompleted - triggered after a controller action is executed, usually for db connection pool back




## License

  MIT