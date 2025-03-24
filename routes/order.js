const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @route   GET /api/orders
 * @desc    Get all orders with optional filtering
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const { userId, status } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        userId: userId || undefined,
        status: status || undefined,
      },
      include: {
        orderDetails: {
          include: { product: true },
        },
        transaction: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get a single order by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
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

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Public
 */
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      orderDetails,
      totalAmount,
      status,
      transactionId,
      claimLoyaltyOffer,
      redeemPoint,
    } = req.body;

    // Validate request
    if (
      !userId ||
      !orderDetails ||
      orderDetails.length === 0 ||
      !transactionId
    ) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    if (claimLoyaltyOffer) {
      console.log("loyalty offer claimed!");
      const userID = req.user?.id;
      const updateUser = await prisma.user.update({
        where: { id: userID },
        data: { loyaltyStatus: "Loyal" },
      });
      //TODO Email
    } else {
      const userID = req.user?.id;
      const userData = await prisma.user.findUnique({
        where: { id: userID },
      });
      if (userData.loyaltyStatus == "Not_Eligible" && totalAmount >= 60) {
        const updateUser = await prisma.user.update({
          where: { id: userID },
          data: { loyaltyStatus: "Eligible" },
        });

        //TODO Email
      }
    }

    // Create order with transaction
    // Create order with transaction
    const newOrder = await prisma.order.create({
      data: {
        userId,
        status: status || "Pending",
        totalAmount,
        orderDetails: {
          create: orderDetails.map((item) => ({
            productId: item.productId,
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
            amount: totalAmount,
            status: "Completed", // Initial transaction status
          },
        },
      },
      include: { orderDetails: true, transaction: true },
    });

    orderDetails.foreach(async (product) => {
      const updateProduct = await prisma.product.update({
        where: { id: product.productId },
        data: { quantity: { decrement: product.quantity } },
      });
    });
    // orderPoint
    const userData = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    const newPoint = userData.orderPoint + totalAmount - redeemPoint;
    const updateUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { orderPoint: newPoint },
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
 * @access  Public
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, orderDetails } = req.body;

    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder)
      return res.status(404).json({ message: "Order not found" });

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: status || existingOrder.status,
        orderDetails: orderDetails
          ? {
              deleteMany: {}, // Clear previous order details
              create: orderDetails.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                total: item.quantity * item.price,
                productName: item.productName,
                categoryName: item.categoryName,
                sizeName: item.sizeName,
              })),
            }
          : undefined,
      },
      include: { orderDetails: true },
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete an order
 * @access  Public
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.orderDetail.deleteMany({ where: { orderId: id } }); // Delete related order details
    await prisma.transaction.deleteMany({ where: { orderId: id } }); // Delete related transaction
    await prisma.order.delete({ where: { id } }); // Delete order

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
