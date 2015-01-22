global.Promise = require("../src/index.js");


function test() {
    console.time("test");
    new Promise(function resolver(resolve, reject) {
        if (Math.random() <= 0.5 ? true : false) {
            resolve(value);
        } else {
            reject(value);
        }
    }).then(
        function success() {
            return "asdf";
        },
        function error() {
            return "fdsa";
        }
    ).then(
        function success() {
            console.timeEnd("test");
        },
        function error() {
            console.timeEnd("test");
        }
    );
}
global.test = test;

test();
