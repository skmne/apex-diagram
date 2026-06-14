const path = require('path');

module.exports = {
    target: 'node',
    mode: 'production',
    entry: './out/extension.js',
    output: {
        path: path.resolve(__dirname, 'dist/extension'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        clean: true
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.js', '.json']
    },
    node: {
        __dirname: false,
        __filename: false
    },
    performance: {
        hints: false
    }
};
