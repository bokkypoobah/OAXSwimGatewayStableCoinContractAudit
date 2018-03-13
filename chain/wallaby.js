module.exports = function () {
    return {
        files: [
            'contracts/**/*.sol',
            'lib/**/*.js',
            'test/helpers.js',
            'test/mocha.opts',
            'solc-input.json'
        ],

        tests: [
            'test/*_test.js'
        ],
        env: {
            type: 'node'
        },
        testFramework: 'mocha',
        setup: function (wallaby) {
            //FIXME This timeout is set in `test/mocha.opts` already,
            // but has no effect in Wallaby
            wallaby.testFramework.timeout(5000)
        }
    }
}
