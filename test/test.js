var assert = require("assert");


describe("PromisePolyfill", function() {
    it("should polyfill promise if not present in global", function(done) {
        var PromisePolyfill,
            sync = true;

        global.Promise = undefined;
        PromisePolyfill = require("../src/index");

        new PromisePolyfill(function resolver(resolve, reject) {
            if (Math.random() <= 0.5 ? true : false) {
                resolve(true);
            } else {
                reject(false);
            }
        }).then(
            function success(value) {
                sync = false;
                assert.equal(value, true);
                return "asdf";
            },
            function error(value) {
                sync = false;
                assert.equal(value, false);
                done();
            }
        ).then(
            function success(value) {
                sync = false;
                assert.equal(value, "asdf");
                done();
            }
        );

        assert.equal(sync, true);
    });
});
