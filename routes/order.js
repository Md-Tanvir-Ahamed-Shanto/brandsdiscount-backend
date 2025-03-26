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
 * @desc    Get all orders with optional filtering
 * @access  Public
 */
router.get("/", verifyUser, paginateOverview("order"), async (req, res) => {
  //   try {
  //     const { userId, status } = req.query;
  //     const orders = await prisma.order.findMany({
  //       where: {
  //         userId: userId || undefined,
  //         status: status || undefined,
  //       },
  //       include: {
  //         orderDetails: {
  //           include: { product: true },
  //         },
  //         transaction: true,
  //         user: true,
  //       },
  //       orderBy: { createdAt: "desc" },
  //     });
  //     res.json(orders);
  //   } catch (error) {
  //     console.error("Error fetching orders:", error);
  //     res.status(500).json({ message: "Server error" });
  //   }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get a single order by ID
 * @access  Public
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
router.post("/", verifyUser, async (req, res) => {
  console.log("order");
  console.log("user", req.user);
  const userId = req.user.id;

  try {
    const {
      orderDetails,
      sku,
      totalAmount,
      status,
      transactionId,
      claimLoyaltyOffer,
      redeemPoint,
    } = req.body;
    console.log(orderDetails);
    // Validate request
    if (!orderDetails || orderDetails.length === 0 || !transactionId) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    if (
      claimLoyaltyOffer &&
      req.user.loyaltyStatus != "Loyal" &&
      totalAmount >= 60
    ) {
      console.log("loyalty offer claimed!");
      console.log("user", req.user);
      const userId = req.user.id;
      const updateUser = await prisma.user.update({
        where: { id: userId },
        data: { loyaltyStatus: "Loyal" },
      });
      //TODO Email
      console.log("sending email");

      await sendLoyaltyEmail(req.user.email, req.user.username);
    } else {
      const userData = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (
        (userData.loyaltyStatus == "Not_Eligible" ||
          userData.loyaltyStatus == "Eligible") &&
        totalAmount >= 60
      ) {
        const updateUser = await prisma.user.update({
          where: { id: userId },
          data: { loyaltyStatus: "Eligible" },
        });
        console.log("sending email");

        //TODO Email
        await sendAbandonedOfferEmail(req.user.email, req.user.username);
      }
    }

    // Create order with transaction
    // Create order with transaction
    const newOrder = await prisma.order.create({
      data: {
        userId,
        status: status || "Pending",
        totalAmount,
        transactionId: transactionId,
        orderDetails: {
          create: orderDetails.map((item) => ({
            productId: item.productId,
            sku: sku,
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

    orderDetails.map(async (product) => {
      const updateProduct = await prisma.product.update({
        where: { id: product.productId },
        data: { stockQuantity: { decrement: product.quantity } },
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
router.patch("/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder)
      return res.status(404).json({ message: "Order not found" });

    // Update order
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
 * @desc    Delete an order
 * @access  Public
 */
router.delete("/:id", verifyUser, ensureRoleAdmin, async (req, res) => {
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
