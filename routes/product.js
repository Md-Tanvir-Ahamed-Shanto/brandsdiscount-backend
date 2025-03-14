let express = require("express");
let router = express.Router();

let ensureLogIn = require("connect-ensure-login").ensureLoggedIn;

const jwt = require("jsonwebtoken");
const { verifyUser } = require("../tools/authenticate");

// //Middleware to check user role
let { ensureRoleAdmin } = require("../tools/tools.js");

//Middleware to paginate overview lists
let { paginateOverview } = require("../tools/pagination.js");

// Middleware to get bucket file
let { bucket } = require("../tools/cloudStorage.js");

/* GET product listing. */
router.get("/", verifyUser, ensureRoleAdmin, async function (req, res, next) {
  res.send("product route");
});

module.exports = router;
