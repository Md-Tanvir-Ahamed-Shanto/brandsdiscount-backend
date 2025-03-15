const passport = require("passport");
const jwt = require("jsonwebtoken");
const dev = process.env.NODE_ENV !== "production";

exports.COOKIE_OPTIONS = {
  httpOnly: true,
  // Since localhost is not having https protocol,
  // secure cookies do not work correctly (in postman)
  secure: false,
  sameSite: "none",
  maxAge: eval(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
};

exports.getToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: eval(process.env.SESSION_EXPIRY),
  });
};

exports.getRefreshToken = (user) => {
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: eval(process.env.REFRESH_TOKEN_EXPIRY),
  });
  return refreshToken;
};

exports.verifyUser = function authenticateJwt(req, res, next) {
  passport.authenticate("jwt", { session: false }, function (err, user, info) {
    if (err) {
      // console.log(err)
      return res
        .status(500)
        .send("An error occured while user authentication.");
    }
    if (!user) {
      // console.log("Token Expired!")
      return res
        .status(401)
        .json({ message: "Invalid or expired access token" });
    }
    req.user = user;
    next();
  })(req, res, next);
};
exports.verifyAPIUser = function authenticateAPI(req, res, next) {
  passport.authenticate(
    "headerapikey",
    { session: false },
    function (err, user, info) {
      if (err) return res.status(400).send("error occured in API validation");
      if (!user) return res.status(400).send("Invalid API key");
      req.user = user;
      next();
    }
  )(req, res, next);
};
