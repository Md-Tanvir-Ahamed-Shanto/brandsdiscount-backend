//Middleware to check user role
let ensureRoleAdmin = function (req, res, next) {
  //console.log(req.user)
  if (req.user.role === "Admin" || req.user.role === "SuperAdmin") {
    return next();
  }

  res
    .status(403)
    .send({ error: "You are not authorized to perform this action" });
};

let ensureUploader = function (req, res, next) {
  if (req.user.role === "WareHouse" || req.user.role === "SuperAdmin" || req.user.role === "Admin") {
    return next();
  }
  res
    .status(403)
    .send({ error: "You are not authorized to perform this action" });
}

module.exports = { ensureRoleAdmin , ensureUploader };
