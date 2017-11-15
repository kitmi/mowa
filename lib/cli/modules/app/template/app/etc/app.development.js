module.exports = {
    loggers: {        
        'accessLog': {
            transports: [
                {type: 'file', options: {
                    level: 'info',
                    json: false,
                    formatter: options => options.message,
                    filename: 'logs/' + $name + '-access-' + $now.format('YYYYMMDD') + '.log'
                }}
            ]
        }
    },
    middlewares: {
        favicon: 'public/favicon.ico',
        accessLog: {
            logger: 'accessLog'
        },
        compress: {},
        etag: {},
        serveStatic: {}
    },
    routing: require('./routing.js')
};