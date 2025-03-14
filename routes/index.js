let express = require("express");
let router = express.Router();

let ensureLogIn = require("connect-ensure-login").ensureLoggedIn;
let ensureLoggedIn = ensureLogIn("/auth/login");

router.get("/", async function (req, res, next) {
  // res.sendFile(path.join(__dirname, "/react_app/build", "index.html"));
});

module.exports = router;
