const express = require("express");
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  sendOrderEmail,
} = require("../controllers/order.controller");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools");

const orderRoutes = express.Router();

// Create a new order
orderRoutes.post("/", createOrder);

// Get all orders
orderRoutes.get("/", getAllOrders);

// Get a single order by ID
orderRoutes.get("/:id", getOrderById);

// Update an order by ID
orderRoutes.put("/:id",verifyUser, ensureRoleAdmin, updateOrder);

// Delete an order by ID
orderRoutes.delete("/:id",verifyUser, ensureRoleAdmin, deleteOrder);
orderRoutes.post(":id/send-email",verifyUser, ensureRoleAdmin, sendOrderEmail);

module.exports = orderRoutes;
