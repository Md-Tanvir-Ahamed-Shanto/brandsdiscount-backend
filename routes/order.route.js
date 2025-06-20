const express = require("express");
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  sendOrderEmail,
} = require("../controllers/order.controller");

const orderRoutes = express.Router();

// Create a new order
orderRoutes.post("/", createOrder);

// Get all orders
orderRoutes.get("/", getAllOrders);

// Get a single order by ID
orderRoutes.get("/:id", getOrderById);

// Update an order by ID
orderRoutes.put("/:id", updateOrder);

// Delete an order by ID
orderRoutes.delete("/:id", deleteOrder);
orderRoutes.post(":id/send-email", sendOrderEmail);

module.exports = orderRoutes;
