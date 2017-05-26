module.exports = {
    bootstrap: {
        path: 'test/boot'
    },
    i18n: {
        store: 'file',
        precedence: [ 'query', 'cookie', 'header' ],
        queryKey: 'locale',
        cookieKey: 'locale',
        options: {
            reverseUpdate: false,
            updateWithMeta: false,
            defaultLocale: 'en_US',
            timezone: 'Australia/Sydney',
            directory: 'locale'
        }
    },
    loggers: {
        'accessLog': {
            transports: [
                {type: 'console'},
                {type: 'file', options: {
                    level: 'verbose',
                    json: false,
                    formatter: options => options.message,
                    filename: 'test/temp/access-' + $now.format('YYYYMMDD') + '.log'
                }}
            ]
        }
    },
    koa: {
        trustProxy: true,
        cookieSecretKeys: [ '18b98f14', 'f519e6d5', 'e92c78780', '870b5454' ]
    },
    middlewares: {
        favicon: 'test/temp/favicon.ico',
        compress: {},
        etag: {},
        test: {},
        serveStatic: { root: 'test/temp' },
        bodyParser: {},
        methodOverride: {}
    },
    routing: {
        '/': {
            rule: {
                middlewares: {
                    swig: {
                        views: 'test/server/views-swig',
                        autoescape: true,
                        cache: 'memory', // disable, set to false
                        ext: 'swig'
                    }
                },
                rules: {
                    'get:/test': 'test.index'
                }
            }
        },
        '/api': {
            rest: {
                resources: 'test/resources'
            }
        },
        '/submodule': {
            mod: {
                name: 'test'
            }
        }
    }
};