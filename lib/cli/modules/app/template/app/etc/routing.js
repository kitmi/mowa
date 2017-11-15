module.exports = {
    '/': {
        rule: {
            middlewares: {
                swig: {
                    autoescape: true,
                    cache: 'memory',
                    ext: 'html'
                }
            },
            rules: {
                '/': {
                    get: {
                        action: 'home.index'
                    }
                }
            }
        }
    }
};