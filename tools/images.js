// Middleware to get bucket file
let { bucket } = require("../tools/cloudStorage.js");

const sendUploadToGCS = (req, res, next) => {
  if (!req.file) {
    return next();
  }
};

const Multer = require("multer"),
  multer = Multer({
    storage: Multer.memoryStorage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    // dest: '../images'
  });

module.exports = {
  //getPublicUrl,
  sendUploadToGCS,
  //getPrivateUrl,
  multer,
};
