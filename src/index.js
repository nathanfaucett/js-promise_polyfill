var isArray = require("is_array"),
    isObject = require("is_object"),
    isFunction = require("is_function"),
    createStore = require("create_store"),
    fastSlice = require("fast_slice");


var PromisePolyfill, PrivatePromise;


if (typeof(Promise) !== "undefined") {
    PromisePolyfill = Promise;
} else {
    PrivatePromise = (function() {

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

        PrivatePromise.store = createStore();

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
                        if (done) {
                            return;
                        }
                        done = true;
                        onFulfilled(value);
                    },
                    function(reason) {
                        if (done) {
                            return;
                        }
                        done = true;
                        onRejected(reason);
                    }
                );
            } catch (err) {
                if (done) {
                    return;
                }
                done = true;
                onRejected(err);
            }
        }

        function resolveValue(_this, newValue) {
            try {
                if (newValue === _this) {
                    throw new TypeError("A promise cannot be resolved with itself");
                }

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
            } catch (err) {
                rejectValue(_this, err);
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

            if (_this.state === null) {
                _this.handlers.push(handler);
                return;
            }

            process.nextTick(function nextTick() {
                var callback = state ? handler.onFulfilled : handler.onRejected,
                    value = _this.value,
                    out;

                if (callback === null) {
                    (state ? handler.resolve : handler.reject)(value);
                    return;
                }

                try {
                    out = callback(value);
                } catch (err) {
                    handler.reject(err);
                    return;
                }

                handler.resolve(out);
            });
        }

        return PrivatePromise;
    }());

    PromisePolyfill = function Promise(resolver) {

        if (!(this instanceof PromisePolyfill)) {
            throw new TypeError("Promise(resolver) \"this\" must be an instance of of Promise");
        }
        if (!isFunction(resolver)) {
            throw new TypeError("Promise(resolver) You must pass a resolver function as the first argument to the promise constructor");
        }

        PrivatePromise.store.set(this, new PrivatePromise(resolver));
    };

    PromisePolyfill.prototype.then = function(onFulfilled, onRejected) {
        var _this = PrivatePromise.store.get(this);

        return new PromisePolyfill(function resolver(resolve, reject) {
            PrivatePromise.handle(_this, onFulfilled, onRejected, resolve, reject);
        });
    };
}


if (!isFunction(PromisePolyfill.prototype["catch"])) {
    PromisePolyfill.prototype["catch"] = function(onRejected) {
        return this.then(null, onRejected);
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
    PromisePolyfill.defer = function() {
        var deferred = {};

        deferred.promise = new PromisePolyfill(function resolver(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });

        return deferred;
    };
}

if (!isFunction(PromisePolyfill.all)) {
    PromisePolyfill.all = function(value) {
        var args = (arguments.length === 1 && isArray(value)) ? value : fastSlice(arguments);

        return new PromisePolyfill(function resolver(resolve, reject) {
            var length = args.length,
                i = -1,
                il = length - 1;

            if (length === 0) {
                resolve([]);
                return;
            }

            function resolveValue(index, value) {
                try {
                    if (value && (isObject(value) || isFunction(value)) && isFunction(value.then)) {
                        value.then(function(v) {
                            resolveValue(index, v);
                        }, reject);
                        return;
                    }
                    if (--length === 0) {
                        resolve(args);
                    }
                } catch (e) {
                    reject(e);
                }
            }

            while (i++ < il) {
                resolveValue(i, args[i]);
            }
        });
    };
}

if (!isFunction(PromisePolyfill.race)) {
    PromisePolyfill.race = function(values) {
        return new PromisePolyfill(function resolver(resolve, reject) {
            var i = -1,
                il = values.length - 1,
                value;

            while (i++ < il) {
                value = values[i];

                if (value && (isObject(value) || isFunction(value)) && isFunction(value.then)) {
                    value.then(resolve, reject);
                }
            }
        });
    };
}


module.exports = PromisePolyfill;
