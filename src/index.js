module.exports = typeof(Promise) !== "undefined" ? Promise : (function() {
    var type = require("type"),
        slice = Array.prototype.slice;


    function Handler(onFulfilled, onRejected, resolve, reject) {
        this.onFulfilled = type.isFunction(onFulfilled) ? onFulfilled : null;
        this.onRejected = type.isFunction(onRejected) ? onRejected : null;
        this.resolve = resolve;
        this.reject = reject;
    }

    function handleResolve(resolver, onFulfilled, onRejected) {
        var done = false;

        try {
            resolver(
                function(value) {
                    if (done) return;
                    done = true;
                    onFulfilled(value);
                },
                function(reason) {
                    if (done) return;
                    done = true;
                    onRejected(reason);
                }
            );
        } catch (e) {
            if (done) return
            done = true
            onRejected(e);
        }
    }

    function resolveValue(promise, newValue) {

        try {
            if (newValue === promise) throw new TypeError("A promise cannot be resolved with itself");

            if (newValue && (type.isObject(newValue) || type.isFunction(newValue))) {
                if (type.isFunction(newValue.then)) {
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
            promise._state = true;
            promise._value = newValue;
            finale(promise);
        } catch (e) {
            rejectValue(promise, e);
        }
    }

    function rejectValue(promise, newValue) {
        promise._state = false;
        promise._value = newValue;
        finale(promise);
    }

    function finale(promise) {
        var handlers = promise._handlers,
            i = 0,
            il = handlers.length;

        for (; i < il; i++) handle(promise, handlers[i]);
        handlers.length = 0;
    }

    function handle(promise, handler) {
        var state = promise._state;

        if (promise._state === null) {
            promise._handlers.push(handler);
            return;
        }

        process.nextTick(function nextTick() {
            var callback = state ? handler.onFulfilled : handler.onRejected,
                value = promise._value,
                out;

            if (callback === null) {
                (state ? handler.resolve : handler.reject)(value);
                return;
            }

            try {
                out = callback(value);
            } catch (e) {
                handler.reject(e);
                return;
            }

            handler.resolve(out);
        });
    }


    function Promise(resolver) {
        var _this = this;

        if (!(this instanceof Promise)) {
            throw new TypeError("Promise(resolver) \"this\" must be an instance of of Promise");
        }
        if (!type.isFunction(resolver)) {
            throw new TypeError("Promise(resolver) You must pass a resolver function as the first argument to the promise constructor");
        }

        this._state = null;
        this._value = null;
        this._handlers = [];

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

    Promise.prototype.then = function(onFulfilled, onRejected) {
        var _this = this;

        return new Promise(function resolver(resolve, reject) {
            handle(_this, new Handler(onFulfilled, onRejected, resolve, reject));
        })
    };

    Promise.prototype["catch"] = function(onRejected) {

        return this.then(null, onRejected);
    };

    Promise.resolve = function(value) {
        if (value instanceof Promise) return value;

        return new Promise(function resolver(resolve) {
            resolve(value);
        });
    };

    Promise.reject = function(value) {
        return new Promise(function resolver(resolve, reject) {
            reject(value);
        });
    };

    Promise.defer = function() {
        var deferred = {};

        deferred.promise = new Promise(function(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });

        return deferred;
    };

    Promise.all = function(value) {
        var args = (arguments.length === 1 && type.isArray(value)) ? value : slice.call(arguments);

        return new Promise(function resolver(resolve, reject) {
            var i = 0,
                il = args.length,
                remaining = il,
                value, then;

            if (remaining === 0) {
                resolve([]);
                return;
            }

            function resolveValue(index, value) {
                try {
                    if (value && (type.isObject(value) || type.isFunction(value))) {

                        if (type.isFunction(value.then)) {
                            value.then(function(value) {
                                resolveValue(index, value);
                            }, reject);
                            return;
                        }
                    }
                    if (--remaining === 0) {
                        resolve(args);
                    }
                } catch (e) {
                    reject(e);
                }
            }

            for (; i < il; i++) resolveValue(i, args[i]);
        });
    };

    Promise.race = function(values) {
        return new Promise(function resolver(resolve, reject) {
            var i = 0,
                il = values.length;

            for (; i < il; i++) {
                values[i].then(resolve, reject);
            }
        });
    };


    return Promise;
}());
