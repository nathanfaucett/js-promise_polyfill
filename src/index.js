var isNull = require("@nathanfaucett/is_null"),
    isArray = require("@nathanfaucett/is_array"),
    isObject = require("@nathanfaucett/is_object"),
    isFunction = require("@nathanfaucett/is_function"),
    apply = require("@nathanfaucett/apply"),
    WeakMapPolyfill = require("@nathanfaucett/weak_map_polyfill"),
    fastSlice = require("@nathanfaucett/fast_slice"),
    Iterator = require("@nathanfaucett/iterator");


var PromisePolyfill, PromisePolyfillPrototype, PrivatePromise, Defer;


if (
    typeof(Promise) !== "undefined" &&
    (function isValidPromise() {
        try {
            new Promise(function resolver(resolve) {
                resolve(true);
            }).then(function onThen() {});
            return true;
        } catch (e) {
            return false;
        }
    }())
) {
    PromisePolyfill = Promise;
    PromisePolyfillPrototype = PromisePolyfill.prototype;
} else {
    PrivatePromise = (function createPrivatePromise() {

        function PrivatePromise(resolver) {
            var _this = this;

            this.handlers = [];
            this.state = null;
            this.value = null;

            handleResolve(
                resolver,
                function resolve(newValue) {
                    resolveValue(_this, newValue);
                },
                function reject(newValue) {
                    rejectValue(_this, newValue);
                }
            );
        }

        PrivatePromise.store = new WeakMapPolyfill();

        PrivatePromise.handle = function(_this, onFulfilled, onRejected, resolve, reject) {
            handle(_this, new Handler(onFulfilled, onRejected, resolve, reject));
        };

        function Handler(onFulfilled, onRejected, resolve, reject) {
            this.onFulfilled = isFunction(onFulfilled) ? onFulfilled : null;
            this.onRejected = isFunction(onRejected) ? onRejected : null;
            this.resolve = resolve;
            this.reject = reject;
        }

        function handleResolve(resolver, onFulfilled, onRejected) {
            var done = false;

            try {
                resolver(
                    function(value) {
                        if (!done) {
                            done = true;
                            onFulfilled(value);
                        }
                    },
                    function(reason) {
                        if (!done) {
                            done = true;
                            onRejected(reason);
                        }
                    }
                );
            } catch (err) {
                if (!done) {
                    done = true;
                    onRejected(err);
                }
            }
        }

        function resolveValue(_this, newValue) {
            try {
                if (newValue === _this) {
                    throw new TypeError("A promise cannot be resolved with itself");
                } else {
                    if (newValue && (isObject(newValue) || isFunction(newValue))) {
                        if (isFunction(newValue.then)) {
                            handleResolve(
                                function resolver(resolve, reject) {
                                    newValue.then(resolve, reject);
                                },
                                function resolve(newValue) {
                                    resolveValue(_this, newValue);
                                },
                                function reject(newValue) {
                                    rejectValue(_this, newValue);
                                }
                            );
                            return;
                        }
                    }
                    _this.state = true;
                    _this.value = newValue;
                    finale(_this);
                }
            } catch (error) {
                rejectValue(_this, error);
            }
        }

        function rejectValue(_this, newValue) {
            _this.state = false;
            _this.value = newValue;
            finale(_this);
        }

        function finale(_this) {
            var handlers = _this.handlers,
                i = -1,
                il = handlers.length - 1;

            while (i++ < il) {
                handle(_this, handlers[i]);
            }

            handlers.length = 0;
        }

        function handle(_this, handler) {
            var state = _this.state;

            if (isNull(_this.state)) {
                _this.handlers.push(handler);
            } else {
                process.nextTick(function onNextTick() {
                    var callback = state ? handler.onFulfilled : handler.onRejected,
                        value = _this.value,
                        out;

                    if (isNull(callback)) {
                        if (state) {
                            handler.resolve(value);
                        } else {
                            handler.reject(value);
                        }
                    } else {
                        try {
                            out = callback(value);
                            handler.resolve(out);
                        } catch (err) {
                            handler.reject(err);
                        }
                    }
                });
            }
        }

        return PrivatePromise;
    }());

    PromisePolyfill = function Promise(resolver) {

        if (!isFunction(resolver)) {
            throw new TypeError("Promise(resolver) You must pass a resolver function as the first argument to the promise constructor");
        }

        PrivatePromise.store.set(this, new PrivatePromise(resolver));
    };

    PromisePolyfillPrototype = PromisePolyfill.prototype;

    PromisePolyfillPrototype.then = function(onFulfilled, onRejected) {
        var _this = PrivatePromise.store.get(this);

        return new PromisePolyfill(function resolver(resolve, reject) {
            PrivatePromise.handle(_this, onFulfilled, onRejected, resolve, reject);
        });
    };
}

if (!isFunction(PromisePolyfillPrototype["catch"])) {
    PromisePolyfillPrototype["catch"] = function(reject) {
        return this.then(null, reject);
    };
}

if (!isFunction(PromisePolyfill.resolve)) {
    PromisePolyfill.resolve = function(value) {
        if (value instanceof PromisePolyfill) {
            return value;
        }

        return new PromisePolyfill(function resolver(resolve) {
            resolve(value);
        });
    };
}

if (!isFunction(PromisePolyfill.reject)) {
    PromisePolyfill.reject = function(value) {
        return new PromisePolyfill(function resolver(resolve, reject) {
            reject(value);
        });
    };
}

if (!isFunction(PromisePolyfill.defer)) {
    Defer = function Defer() {
        var _this = this;

        this.resolve = null;
        this.reject = null;

        this.promise = new PromisePolyfill(function resolver(resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
        });
    };

    PromisePolyfill.defer = function() {
        return new Defer();
    };
}

if (!isFunction(PromisePolyfill.all)) {
    PromisePolyfill.all = function(value) {
        var values = (arguments.length === 1 && isArray(value)) ? value : fastSlice(arguments);

        return new PromisePolyfill(function resolver(resolve, reject) {
            var iterator = Iterator.getIterator(values),
                called = false,
                count = 0,
                it, step, value, resolveFn, rejectFn, results;

            if (iterator) {
                it = iterator.call(values);

                resolveFn = function resolveFn(value) {
                    if (!called) {
                        results = results || [];
                        results[results.length] = value;

                        if (--count === 0) {
                            called = true;
                            resolve(results);
                        }
                    }
                };
                rejectFn = function rejectFn(value) {
                    if (!called) {
                        called = true;
                        reject(value);
                    }
                };

                while (!(step = it.next()).done) {
                    count++;
                    value = step.value;

                    if (value && isFunction(value.then)) {
                        value.then(resolveFn, rejectFn);
                    } else {
                        resolveFn(value);
                    }
                }
            } else {
                reject(new Error("Invalid Iterator " + typeof(values)));
            }
        });
    };
}

if (!isFunction(PromisePolyfill.race)) {
    PromisePolyfill.race = function(value) {
        var values = (arguments.length === 1 && isArray(value)) ? value : fastSlice(arguments);

        return new PromisePolyfill(function resolver(resolve, reject) {
            var iterator = Iterator.getIterator(values),
                it, step, value;

            if (iterator) {
                it = iterator.call(values);

                while (!(step = it.next()).done) {
                    value = step.value;

                    if (value && isFunction(value.then)) {
                        value.then(resolve, reject);
                    } else {
                        resolve(value);
                    }
                }
            } else {
                reject(new Error("Invalid Iterator " + typeof(values)));
            }
        });
    };
}

if (!isFunction(PromisePolyfill.promisify)) {
    PromisePolyfill.promisify = function(fn, thisArg) {
        return function promisified() {
            var defer = PromisePolyfill.defer(),
                args = fastSlice(arguments);

            function callback(error, value) {
                if (error) {
                    return defer.reject(error);
                } else {
                    if (arguments.length < 3) {
                        return defer.resolve(value);
                    } else {
                        return defer.resolve(fastSlice(arguments, 1));
                    }
                }
            }

            args[args.length] = callback;
            apply(fn, args, thisArg);

            return defer.promise;
        };
    };
}


module.exports = PromisePolyfill;