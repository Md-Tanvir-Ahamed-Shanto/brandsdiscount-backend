//Middleware to check user role
let ensureRoleAdmin = function (req, res, next) {
  //console.log(req.user)
  if (req.user.role === "Admin") {
    return next();
  }

  res
    .status(403)
    .send({ error: "You are not authorized to perform this action" });
};

module.exports = { ensureRoleAdmin };
