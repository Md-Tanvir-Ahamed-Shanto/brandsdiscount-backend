const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();

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

    for (const file of req.files.productImages || []) {
      uploadedImages.push(await uploadFile(file));
    }

    for (const file of req.files.variantImages || []) {
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

module.exports = { multerUpload, uploadImagesToCloudflare };
