//Middleware to check user role
let ensureRoleAdmin = function (req, res, next) {
  //console.log(req.user)
  if (req.user.role === "Admin") {
    return next();
  }
};

module.exports = { ensureRoleAdmin };
