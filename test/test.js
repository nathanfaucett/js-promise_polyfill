var assert = require("assert");


describe("PromisePolyfill", function() {
    it("should polyfill promise if not present in global", function() {
        var PromisePolyfill,
            value = true;

        global.Promise = undefined;
        PromisePolyfill = require("../src/index");

        new PromisePolyfill(function resolver(resolve, reject) {
            if (Math.random() <= 0.5 ? true : false) {
                resolve(value);
            } else {
                reject(value);
            }
        }).then(
            function success() {
                value = false;
                return "asdf";
            },
            function error() {
                value = false;
                return "fdsa";
            }
        ).then(
            function success(value) {
                assert.equal(value, "asdf");
            },
            function error() {
                assert.equal(value, "fdsa");
            }
        );

        assert.equal(value, true);
    });
});
