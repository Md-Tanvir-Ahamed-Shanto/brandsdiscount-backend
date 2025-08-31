const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

// Use memory storage for Vercel serverless
const storage = multer.memoryStorage();
const upload = multer({ storage });

const multerUpload = upload.fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'variantImages', maxCount: 10 }
]);

const uploadImagesToCloudflare = async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    req.uploadedImageUrls = [];
    req.uploadedVariantUrls = [];
    return next();
  }

  try {
    const uploadedImages = [];
    const uploadedVariantImages = [];

    const allFiles = [...(req.files.productImages || [])];
    const variantFiles = [...(req.files.variantImages || [])];

    // Helper function to upload a single file
    const uploadFile = async (file) => {
      const form = new FormData();
      form.append("file", file.buffer, file.originalname);

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

      return response.data.result.variants[0];
    };

    // Upload product images
    for (const file of allFiles) {
      uploadedImages.push(await uploadFile(file));
    }

    // Upload variant images
    for (const file of variantFiles) {
      uploadedVariantImages.push(await uploadFile(file));
    }

    req.uploadedImageUrls = uploadedImages;
    req.uploadedVariantUrls = uploadedVariantImages;

    next();
  } catch (error) {
    console.error("Cloudflare upload error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Cloudflare image upload failed." });
  }
};

// Delete image from Cloudflare
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
