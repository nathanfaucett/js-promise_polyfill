var tape = require("tape");


function isValidPromise() {
    try {
        new Promise(function resolver(resolve) {
            resolve(true);
        }).then(function onThen() {});
        return true;
    } catch (e) {
        return false;
    }
}


tape("PromisePolyfill() should polyfill promise if not present in global", function(assert) {
    var Promise = isValidPromise() ? global.Promise : undefined,
        PromisePolyfill;

    global.Promise = undefined;
    global.PromisePolyfill = PromisePolyfill = require("..");
    global.Promise = Promise = Promise || PromisePolyfill;

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
                assert.equal(value, true);
                return value;
            },
            function error(value) {
                assert.equal(value, false);
                return value;
            }
        ).then(
            function finalSuccess() {
                sync = false;
                callback();
            }
        );

        assert.equal(sync, true);
    }

    run(Promise, false, function onDone(error) {
        if (error) {
            assert.end(error);
        } else {
            run(Promise, true, function onDone(error) {
                if (error) {
                    assert.end(error);
                } else {
                    run(PromisePolyfill, false, function onDone(error) {
                        if (error) {
                            assert.end(error);
                        } else {
                            run(PromisePolyfill, true, function onDone(error) {
                                if (error) {
                                    assert.end(error);
                                } else {
                                    assert.end();
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

tape("PromisePolyfill.all(iterable) returns a promise that resolves when all of the promises in the iterable", function(assert) {
    var PromisePolyfill = require("..");

    PromisePolyfill.all([
        PromisePolyfill.resolve(true),
        true,
        PromisePolyfill.resolve(true)
    ]).then(function(values) {
        assert.deepEquals(values, [true, true, true]);
        assert.end();
    }, function(error) {
        assert.end(error);
    });
});

tape("PromisePolyfill.race(iterable) method returns a promise that resolves or rejects as soon as one of the promises in the iterable resolves or rejects", function(assert) {
    var PromisePolyfill = require("..");

    PromisePolyfill.race([
        PromisePolyfill.resolve(false),
        true,
        PromisePolyfill.resolve(false)
    ]).then(function(value) {
        assert.equals(value, true);
        assert.end();
    }, function(error) {
        assert.end(error);
    });
});