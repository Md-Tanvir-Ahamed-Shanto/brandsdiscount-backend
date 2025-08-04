const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
require("dotenv").config(); 


const upload = multer({ dest: "uploads/" });

const uploadImagesToCloudflare = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    console.log("No new files provided for Cloudflare upload.");
    req.uploadedImageUrls = []; // Use a more descriptive name to avoid conflict with `req.images` from frontend
    return next(); // No files to upload, proceed to the next middleware
  }

  try {
    const uploadedImages = [];

    for (const file of req.files) {
      // Basic check for file existence, though Multer usually handles this
      if (!fs.existsSync(file.path)) {
        console.warn(`Temporary file not found for path: ${file.path}. Skipping.`);
        continue;
      }

      const fileStream = fs.createReadStream(file.path);
      const form = new FormData();
      form.append("file", fileStream, file.originalname); // Add original filename for Cloudflare
      // You can add metadata if needed, for example:
      // form.append("metadata", JSON.stringify({ filename: file.originalname, user: req.user.id }));


      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
        form,
        {
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGES_TOKEN}`,
            ...form.getHeaders(), // Essential for FormData with Axios
          },
          maxContentLength: Infinity, // Important for large files
          maxBodyLength: Infinity,    // Important for large files
        }
      );

      // Clean up the temporary file created by Multer
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Error deleting temporary file ${file.path}:`, err);
      });

      uploadedImages.push(response.data.result.variants[0] // Assuming the first variant is the desired public URL
      );
    }
    req.uploadedImageUrls = uploadedImages;
    next(); // Pass control to the next middleware (e.g., createProduct)
  } catch (error) {
    console.error("Error during Cloudflare image upload:");
    if (error.response) {
      console.error("Cloudflare API Response Error:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("Cloudflare API No Response received:", error.request);
    } else {
      console.error("Cloudflare API Request setup error:", error.message);
    }

    // Ensure temporary files are cleaned up even on error
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

// Middleware for deleting an image from Cloudflare
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
      "Error deleting image from Cloudflare:",
      error.response ? error.response.data : error.message
    );
    throw error; // Re-throw to allow caller to handle it
  }
};

module.exports = {
  
  multerUpload: upload,
  
  uploadImagesToCloudflare,
  
  deleteCloudflareImage,
};