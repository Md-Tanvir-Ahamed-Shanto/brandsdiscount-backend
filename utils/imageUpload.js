const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

// Use memory storage for Vercel serverless functions
const storage = multer.memoryStorage();
const upload = multer({ storage });

const multerUpload = upload.fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'variantImages', maxCount: 10 }
]);

const uploadImagesToCloudflare = async (req, res, next) => {
  // Your code to handle the upload and send to Cloudflare
  // This part of your code is already correct, as it uses file.buffer
  // to get the in-memory data.
  // ...
};

module.exports = {
  multerUpload,
  uploadImagesToCloudflare,
};