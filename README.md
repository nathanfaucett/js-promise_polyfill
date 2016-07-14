Promise
=======

Promise polyfill for the browser and node.js


```javascript
var Promise = require("@nathanfaucett/promise_polyfill");


new Promise(function resolver(resolve, reject) {
    if (value) {
        resolve(true);
    } else {
        reject(false);
    }
}).then(
    function success(value) {
        return value;
    },
    function error(value) {
        return value;
    }
);
````
