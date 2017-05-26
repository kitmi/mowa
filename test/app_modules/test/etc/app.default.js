module.exports = {
    middlewares: {
        serveStatic: { root: 'www' }
    },
    routing: {
        '/': {
            rule: {
                middlewares: {
                    swig: {
                        autoescape: true,
                        cache: false, // disable, set to false
                        ext: 'swig'
                    }
                },
                rules: {
                    'get:/test': 'test.index'
                }
            }
        }
    }
};