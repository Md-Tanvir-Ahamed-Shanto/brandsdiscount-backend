const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

// MEMORY storage for serverless
const storage = multer.memoryStorage();

const upload = multer({ storage });

// handle multiple fields
const multerUpload = upload.fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'variantImages', maxCount: 10 }
]);

// Upload images to Cloudflare
const uploadImagesToCloudflare = async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    req.uploadedImageUrls = [];
    req.uploadedVariantUrls = [];
    return next();
  }

  try {
    const uploadedImages = [];
    const uploadedVariantImages = [];

    // Upload product images
    for (const file of req.files.productImages || []) {
      const form = new FormData();
      form.append("file", file.buffer, { filename: file.originalname });

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

      uploadedImages.push(response.data.result.variants[0]);
    }

    // Upload variant images
    for (const file of req.files.variantImages || []) {
      const form = new FormData();
      form.append("file", file.buffer, { filename: file.originalname });

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

    return res.status(500).json({ error: "Image upload to Cloudflare failed." });
  }
};

// Delete an image from Cloudflare
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
