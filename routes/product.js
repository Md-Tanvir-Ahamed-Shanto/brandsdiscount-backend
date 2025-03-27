let express = require("express");
let router = express.Router();

let ensureLogIn = require("connect-ensure-login").ensureLoggedIn;

const jwt = require("jsonwebtoken");
const { verifyUser } = require("../tools/authenticate");

// //Middleware to check user role
let { ensureRoleAdmin } = require("../tools/tools.js");

//Middleware to paginate overview lists
let { paginateOverview } = require("../tools/pagination.js");

// Middleware to get bucket file
let { bucket } = require("../tools/cloudStorage.js");
const images = require("../tools/images");

const { PrismaClient } = require("@prisma/client");
const { uploadImages, deleteCloudflareImage } = require("../tools/images");
const prisma = new PrismaClient();

/* Get Products */
router.get(
  "/products",
  paginateOverview("product")
  // async function (req, res, next) {
  //   res.send("product route");
  // }
);

// API route to get a single product by ID
router.get("/product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: {
        id: id,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

/* Create product listing. */
router.post(
  "/new",
  verifyUser,
  ensureRoleAdmin,
  uploadImages,
  async function (req, res, next) {
    try {
      const {
        title,
        brandName,
        color,
        sku,
        itemLocation,
        sizeId,
        sizeType,
        categoryId,
        regularPrice,
        salePrice,
        discountPercent,
        stockQuantity,
        condition,
        description,
        status,
      } = req.body;

      const product = await prisma.product.create({
        data: {
          title,
          brandName: brandName || null, // Add if exists
          color: color || null, // Add if exists
          sku,
          images: req.images || [], // If no images provided, use an empty array
          itemLocation: itemLocation || null, // Add if exists
          sizeId: sizeId || null, // Add if exists
          sizeType: sizeType || null, // Add if exists
          categoryId: categoryId || null, // Add if exists
          regularPrice: regularPrice || null, // Add if exists
          salePrice: salePrice || null, // Add if exists
          discountPercent: discountPercent || null, // Add if exists
          stockQuantity: stockQuantity || null, // Add if exists
          condition: condition || null, // Add if exists
          description: description || null, // Add if exists
          status: status || null, // Add if exists
        },
      });
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ error: "Error creating product" });
    }
  }
);

// API route to update a product by ID
router.patch(
  "/update/:id",
  verifyUser,
  ensureRoleAdmin,
  uploadImages, // Utility function for uploading to Google Cloud Storage
  async (req, res) => {
    try {
      // Get the product details before updating
      const productDetails = await prisma.product.findUnique({
        where: { id: req.params.id },
      });

      if (!productDetails) {
        return res.status(404).send({ error: "Product not found" });
      }

      // Initialize the update data object
      let updateData = {};

      // Conditionally add fields to the update data object only if provided
      if (req.body.title) {
        updateData.title = req.body.title;
      }

      if (req.body.brandName) {
        updateData.brandName = req.body.brandName;
      }

      if (req.body.color) {
        updateData.color = req.body.color;
      }

      if (req.body.sku) {
        updateData.sku = req.body.sku;
      }

      if (req.body.itemLocation) {
        updateData.itemLocation = req.body.itemLocation;
      }

      if (req.body.sizeType) {
        updateData.sizeType = req.body.sizeType;
      }

      if (req.body.regularPrice) {
        updateData.regularPrice = parseFloat(req.body.regularPrice);
      }

      if (req.body.salePrice) {
        updateData.salePrice = parseFloat(req.body.salePrice);
      }

      if (req.body.discountPercent) {
        updateData.discountPercent = parseFloat(req.body.discountPercent);
      }

      if (req.body.stockQuantity) {
        updateData.stockQuantity = parseInt(req.body.stockQuantity);
      }

      if (req.body.condition) {
        updateData.condition = req.body.condition;
      }

      if (req.body.description) {
        updateData.description = req.body.description;
      }

      if (req.body.status) {
        updateData.status = req.body.status;
      }

      // If the user provides a profile picture, include it in the update
      if (req.file) {
        updateData.images = req.images; // Assuming `sendUploadToGCS` will upload the image and set this field
      }

      // Set `updatedById` if the user is authenticated
      if (req.user?.id) {
        updateData.updatedById = req.user.id;
      }

      // Perform the update only with the fields provided in the request
      const updatedProduct = await prisma.product.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.status(201).json(updatedProduct);
    } catch (error) {
      console.error(error); // Log the error for debugging
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

// API route to delete a product by ID
router.delete("/delete/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.delete({
      where: { id },
    });

    res.status(200).json({ message: "Product deleted successfully", product });
  } catch (error) {
    res.status(500).json({ error: "Error deleting product" });
  }
});

module.exports = router;
