var tape = require("tape");


tape("PromisePolyfill() should polyfill promise if not present in global", function(assert) {
    var Promise = global.Promise,
        PromisePolyfill;

    global.Promise = undefined;
    PromisePolyfill = require("..");
    global.Promise = Promise;

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
            run(PromisePolyfill, false, function onDone(error) {
                if (error) {
                    assert.end(error);
                } else {
                    assert.end();
                }
            });
        }
    });
});
