const express = require("express");

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStockQuantity,
  updateProductStatus,
  toggleProductOffer,
  bulkUpdateProducts,
} = require("../controllers/product.controller");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools");
const { uploadImages } = require("../tools/images");

const productRoute = express.Router();

// GET all products with filtering, searching, sorting, and pagination
productRoute.get("/products", getProducts);

// GET a single product by ID
productRoute.get("/products/:id", getProductById);

// POST a new product
productRoute.post("/products",verifyUser,ensureRoleAdmin,uploadImages, createProduct);

// PUT/PATCH update an existing product by ID
productRoute.put("/products/:id",verifyUser,ensureRoleAdmin,uploadImages, updateProduct);
productRoute.patch("/products/:id",verifyUser,ensureRoleAdmin,uploadImages, updateProduct); // Often good to have both for flexibility

// DELETE a product by ID
productRoute.delete("/products/:id",verifyUser, ensureRoleAdmin, deleteProduct);

// PATCH update stock quantity for a single product
productRoute.patch("/products/:id/stock-quantity", updateProductStockQuantity);

// PATCH update status for a single product
productRoute.patch("/products/:id/status", updateProductStatus);

// PATCH toggle offer for a single product
productRoute.patch("/products/:id/toggle-offer", toggleProductOffer);

// POST for bulk actions
productRoute.post("/products/bulk-actions", bulkUpdateProducts);

module.exports = { productRoute };
