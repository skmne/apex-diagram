const path = require('path');

module.exports = {
    target: 'web',
    mode: 'production',
    entry: './web/diagram-workspace/index.js',
    output: {
        path: path.resolve(__dirname, 'dist/webview'),
        filename: 'bundle.js',
        clean: true
    },
    resolve: {
        extensions: ['.js']
    },
    performance: {
        hints: false
    }
};
