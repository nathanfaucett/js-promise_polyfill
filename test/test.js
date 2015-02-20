var assert = require("assert");


describe("PromisePolyfill", function() {
    it("should polyfill promise if not present in global", function(done) {
        var Promise = global.Promise,
            PromisePolyfill;

        global.Promise = undefined;
        PromisePolyfill = require("../src/index");

        function run(Promise, value, callback) {
            var sync = true;

            new Promise(function resolver(resolve, reject) {
                if (value) {
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
                    callback();
                    return value;
                }
            ).then(
                function success(value) {
                    sync = false;
                    assert.equal(value, "asdf");
                    callback();
                }
            );
            assert.equal(sync, true);
        }

        run(Promise, true, function(err) {
            if (err) {
                done(err);
            } else {
                run(Promise, false, function() {
                    run(PromisePolyfill, true, function(err) {
                        if (err) {
                            done(err);
                        } else {
                            run(PromisePolyfill, false, done);
                        }
                    });
                });
            }
        });
    });
});
