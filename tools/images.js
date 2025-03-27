const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
require("dotenv").config();

// Configure Multer for temporary file storage
const upload = multer({ dest: "uploads/" });

// Middleware for handling image uploads and attaching URLs to req.images
const uploadImages = (req, res, next) => {
  upload.any()(req, res, async (err) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    if (!req.files || req.files.length === 0) {
      req.images = []; // No images uploaded
      return next();
    }

    try {
      const uploadedImages = [];

      for (const file of req.files) {
        const fileStream = fs.createReadStream(file.path);
        const form = new FormData();
        form.append("file", fileStream);

        const response = await axios.post(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
          form,
          {
            headers: {
              Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGES_TOKEN}`,
              ...form.getHeaders(),
            },
          }
        );

        fs.unlinkSync(file.path); // Cleanup temp file

        uploadedImages.push({
          id: response.data.result.id,
          url: response.data.result.variants[0],
        }); // Store URL
      }

      req.images = uploadedImages; // Attach URLs to req.images
      next(); // Pass control to the next middleware
    } catch (error) {
      console.error(JSON.stringify(error));
      return res.status(500).json({ error: "Image upload failed" });
    }
  });
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

    console.log("Image deleted successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error deleting image:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

module.exports = { uploadImages, deleteCloudflareImage };
