if (typeof(Promise) === "undefined") {
    module.exports = require("./promise");
} else {
    module.exports = Promise;
}
