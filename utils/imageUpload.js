const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const storage = multer.memoryStorage(); // store files in memory
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
    console.error("Cloudflare upload error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Image upload failed." });
  }
};

module.exports = {
  multerUpload,
  uploadImagesToCloudflare,
};
