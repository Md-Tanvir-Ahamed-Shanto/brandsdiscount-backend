const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
require("dotenv").config();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

const multerUpload = upload.fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'variantImages', maxCount: 10 }
]);

const uploadImagesToCloudflare = async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    req.uploadedImageUrls = [];
    return next();
  }

  try {
    const uploadedImages = [];
    const uploadedVariantImages = [];
    const allFiles = [...(req.files.productImages || [])];
    const variantFiles = [...(req.files.variantImages || [])]

    for (const file of allFiles) {
      if (!fs.existsSync(file.path)) {
        console.warn(`Temporary file not found for path: ${file.path}. Skipping.`);
        continue;
      }

      const fileStream = fs.createReadStream(file.path);
      const form = new FormData();
      form.append("file", fileStream, file.originalname);

      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
        form,
        {
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGES_TOKEN}`,
            ...form.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      fs.unlink(file.path, (err) => {
        if (err) console.error(`Error deleting temporary file ${file.path}:`, err);
      });

      uploadedImages.push(response.data.result.variants[0]);
    }
    for (const file of variantFiles) {
      if (!fs.existsSync(file.path)) {
        console.warn(`Temporary file not found for path: ${file.path}. Skipping.`);
        continue;
      }

      const fileStream = fs.createReadStream(file.path);
      const form = new FormData();
      form.append("file", fileStream, file.originalname);

      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
        form,
        {
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGES_TOKEN}`,
            ...form.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      fs.unlink(file.path, (err) => {
        if (err) console.error(`Error deleting temporary file ${file.path}:`, err);
      });

      uploadedVariantImages.push(response.data.result.variants[0]);
    }


    req.uploadedImageUrls = uploadedImages;
    req.uploadedVariantUrls = uploadedVariantImages;
    next();
  } catch (error) {
    console.error("Error during Cloudflare image upload:");
    if (error.response) {
      console.error("Cloudflare API Response Error:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("Cloudflare API No Response received:", error.request);
    } else {
      console.error("Cloudflare API Request setup error:", error.message);
    }

    if (req.files) {
      for (const file of req.files) {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`Error deleting temp file on upload error ${file.path}:`, err);
        });
      }
    }
    return res.status(500).json({ error: "Image upload to Cloudflare failed." });
  }
};

const deleteCloudflareImage = async (imageId) => {
  try {
    const response = await axios.delete(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGES_TOKEN}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error deleting image from Cloudflare:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

module.exports = {
  multerUpload,
  uploadImagesToCloudflare,
  deleteCloudflareImage,
};