const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { verifyUser } = require("../tools/authenticate");
const { paginateOverview } = require("../tools/pagination");
const { sendLoyaltyEmail, sendAbandonedOfferEmail } = require("../tools/email");
const { ensureRoleAdmin } = require("../tools/tools");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @route   GET /api/orders
 * @desc    Get all orders with optional filtering and pagination
 * @access  Admin
 */
router.get("/", verifyUser, paginateOverview("order"), async (req, res) => {
  try {
    const { page, limit, totalPages, totalRecords, data: orders } = req.pagination;
    
    res.json({
      orders,
      pagination: { page, totalPages, totalItems: totalRecords, take: limit },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   GET /api/orders/me
 * @desc    Get all orders for the authenticated user with pagination
 * @access  User
 */
router.get("/me", verifyUser, paginateOverview("order", "userId"), async (req, res) => {
  try {
    const { page, limit, totalPages, totalRecords, data: orders } = req.pagination;

    if (orders.length === 0) return res.status(404).json({ message: "No orders found for this user" });

    res.json({
      orders,
      pagination: { page, totalPages, totalItems: totalRecords, take: limit },
    });
  } catch (error) {
    console.error("Error fetching user's orders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get a single order by ID
 * @access  User (only their own orders) or Admin
 */
router.get("/:id", verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderDetails: { include: { product: true } },
        transaction: true,
        user: true,
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Ensure the user is either the order owner or an admin
    if (order.userId !== req.user.id && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  User
 */
router.post("/", verifyUser, async (req, res) => {
  const userId = req.user.id;

  try {
    const {
      orderDetails,
      totalAmount: clientTotalAmount, // Rename to avoid confusion
      status,
      transactionId,
      claimLoyaltyOffer,
      redeemPoint = 0,
    } = req.body;

    // 1. Basic validation
    if (!orderDetails || orderDetails.length === 0) {
      return res.status(400).json({ message: "Invalid order data: orderDetails and transactionId are required." });
    }

    // 2. Calculate the server-side total amount to prevent manipulation
    const calculatedTotalAmount = orderDetails.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    if (calculatedTotalAmount !== clientTotalAmount) {
      console.warn(`Client totalAmount mismatch. Expected: ${calculatedTotalAmount}, Received: ${clientTotalAmount}`);
    }

    // Use the server-calculated totalAmount for all logic
    const finalTotalAmount = calculatedTotalAmount;

    // 3. Get user data
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyStatus: true, orderPoint: true, email: true, username: true },
    });

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    // 4. Loyalty logic (remains the same but uses finalTotalAmount)
    const newLoyaltyStatus = calculateLoyaltyStatus(userData, finalTotalAmount, claimLoyaltyOffer);

    const newPoint = userData.orderPoint + finalTotalAmount - redeemPoint;

    await prisma.user.update({
      where: { id: userId },
      data: {
        loyaltyStatus: newLoyaltyStatus,
        orderPoint: newPoint,
      },
    });

    if (newLoyaltyStatus === "Loyal" && userData.loyaltyStatus !== "Loyal") {
      await sendLoyaltyEmail(userData.email, userData.username);
    } else if (newLoyaltyStatus === "Eligible" && userData.loyaltyStatus === "Not_Eligible") {
      await sendAbandonedOfferEmail(userData.email, userData.username);
    }

    // 5. Create order with correct totalAmount
    const newOrder = await prisma.order.create({
      data: {
        userId,
        status: status || "Pending",
        totalAmount: finalTotalAmount, // Use the corrected total amount
        transactionId: transactionId,
        orderDetails: {
          create: orderDetails.map((item) => ({
            productId: item.productId,
            sku: item.sku, // Assuming sku is now correctly passed in orderDetails
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
            productName: item.productName,
            categoryName: item.categoryName,
            sizeName: item.sizeName,
          })),
        },
        transaction: {
          create: {
            transactionId: transactionId,
            amount: finalTotalAmount,
            status: "Completed",
          },
        },
      },
      include: { orderDetails: true, transaction: true },
    });

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   PUT /api/orders/:id
 * @desc    Update an order status or details
 * @access  Admin
 */
router.patch("/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder)
      return res.status(404).json({ message: "Order not found" });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: status || existingOrder.status,
      },
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete an order and revert user points
 * @access  Admin
 */
router.delete("/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const orderToDelete = await prisma.order.findUnique({
      where: { id },
      select: { userId: true, totalAmount: true },
    });

    if (!orderToDelete) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (prisma) => {
      // Revert user's order points
      await prisma.user.update({
        where: { id: orderToDelete.userId },
        data: {
          orderPoint: {
            decrement: orderToDelete.totalAmount,
          },
        },
      });

      // Delete the order and related records
      await prisma.order.delete({ where: { id } });
    });

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;


function calculateLoyaltyStatus(userData, totalAmount, claimLoyaltyOffer) {
  if (userData.loyaltyStatus === "Not_Eligible" && totalAmount >= 60) {
    return "Eligible";
  } else if (userData.loyaltyStatus === "Eligible" && claimLoyaltyOffer) {
    return "Loyal";
  }
  return userData.loyaltyStatus; // Return current status if no changes
}