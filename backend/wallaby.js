module.exports = function () {
    return {
        files: [
            'lib/**/*.js',
            'config.json'
        ],

        tests: [
            'test/*_test.js'
        ],
        env: {
            type: 'node'
        },
        testFramework: 'mocha'
    }
}
