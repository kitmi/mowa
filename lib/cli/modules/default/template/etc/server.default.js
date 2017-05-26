module.exports = {
    loggers: {        
        'diagLog': {
            transports: [
                {type: 'file', options: {
                    level: 'verbose',
                    json: false,
                    formatter: options => options.message,
                    filename: 'logs/' + $name + '-diag-' + $now.format('YYYYMMDD') + '.log'
                }}
            ]
        }
    },
    koa: {
        httpPort: 3000
    },
    routing: require('./routing.default.js')
};