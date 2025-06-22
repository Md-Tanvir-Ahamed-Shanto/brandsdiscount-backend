const express = require("express");

const {
  getProducts,
  getProductById,

  updateProduct,
  deleteProduct,
  updateProductStockQuantity,
  updateProductStatus,
  toggleProductOffer,
  bulkUpdateProducts,
  createProduct,
} = require("../controllers/product.controller");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin, ensureUploader } = require("../tools/tools");
const {
  multerUpload,
  uploadImagesToCloudflare,
} = require("../utils/imageUpload");

const productRoutes = express.Router();

// GET all products with filtering, searching, sorting, and pagination
productRoutes.get("/", getProducts);

// GET a single product by ID
productRoutes.get("/:id", getProductById);

// POST a new product
productRoutes.post(
  "/",
  verifyUser,
  ensureUploader,
  multerUpload.array("images", 10), // <--- ADD THIS: Multer middleware to process 'images' field
  uploadImagesToCloudflare,
  createProduct
);

// PUT/PATCH update an existing product by ID
productRoutes.put(
  "/:id",
  verifyUser,
  ensureRoleAdmin,
  multerUpload.array("images", 10), // <--- ADD THIS: Multer middleware to process 'images' field
  uploadImagesToCloudflare,
  updateProduct
);
productRoutes.patch(
  "/:id",
  verifyUser,
  ensureRoleAdmin,
  multerUpload.array("images", 10), // <--- ADD THIS: Multer middleware to process 'images' field
  uploadImagesToCloudflare,
  updateProduct
); // Often good to have both for flexibility

// DELETE a product by ID
productRoutes.delete("/:id", verifyUser, ensureRoleAdmin, deleteProduct);

// PATCH update stock quantity for a single product
productRoutes.patch("/:id/stock-quantity", updateProductStockQuantity);

// PATCH update status for a single product
productRoutes.patch("/:id/status", updateProductStatus);

// PATCH toggle offer for a single product
productRoutes.patch("/:id/toggle-offer", toggleProductOffer);

// POST for bulk actions
productRoutes.post("/bulk-actions", bulkUpdateProducts);

module.exports = { productRoutes };
