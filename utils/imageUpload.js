const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Use Vercel-compatible tmp storage
const tmpDir = "/tmp";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

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

    const uploadFile = async (file) => {
      const filePath = path.join(tmpDir, file.filename);
      const form = new FormData();
      form.append("file", fs.createReadStream(filePath), file.originalname);

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

      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete tmp file:", err);
      });

      return response.data.result.variants[0];
    };

    for (const file of allFiles) {
      uploadedImages.push(await uploadFile(file));
    }

    for (const file of variantFiles) {
      uploadedVariantImages.push(await uploadFile(file));
    }

    req.uploadedImageUrls = uploadedImages;
    req.uploadedVariantUrls = uploadedVariantImages;

    next();
  } catch (error) {
    console.error("Cloudflare upload error:", error.message);
    return res.status(500).json({ error: "Cloudflare image upload failed." });
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
    console.error("Error deleting Cloudflare image:", error.message);
    throw error;
  }
};

module.exports = {
  multerUpload,
  uploadImagesToCloudflare,
  deleteCloudflareImage,
};
