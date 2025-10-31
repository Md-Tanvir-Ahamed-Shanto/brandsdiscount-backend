const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { createNotificationService } = require("../services/notificationService");
const { 
  sendOrderConfirmationEmail, 
  sendOrderProcessingEmail, 
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendEmail
} = require("../tools/email.js");

// Create a new order
const createOrder = async (req, res) => {
  const { userId, status, totalAmount, orderDetails, transaction } = req.body;

  if (
    !userId ||
    !status ||
    !totalAmount ||
    !orderDetails ||
    !Array.isArray(orderDetails) ||
    orderDetails.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Missing required fields for order or orderDetails." });
  }

  try {
    const newOrder = await prisma.order.create({
      data: {
        userId,
        status,
        totalAmount,
        orderDetails: {
          create: orderDetails.map((detail) => ({
            sku: detail.sku,
            productId: detail.productId,
            quantity: detail.quantity,
            price: detail.price,
            total: detail.total,
            productName: detail.productName,
            categoryName: detail.categoryName,
            sizeName: detail.sizeName,
          })),
        },
        ...(transaction && {
          transaction: {
            create: {
              transactionId: transaction.transactionId,
              amount: transaction.amount,
              status: transaction.status,
            },
          },
        }),
      },
      include: {
        orderDetails: true,
        transaction: true,
        user: true, // Assuming you have a User model and want to include user details
      },
    });

    const notification = await createNotificationService({
      title: "New Sale on Website",
      message: `Order ${newOrder.orderId} for ${newOrder.orderDetails.length}x ${newOrder.orderDetails[0].productName} sold on Website. Fulfillment from ${newOrder.location}. Please ensure stock is removed from physical store if applicable.`,
      location: newOrder.location,
      selledBy: WEBSITE,
    });
    
    // Send order confirmation email to customer
    try {
      if (newOrder.user && newOrder.user.email) {
        await sendOrderConfirmationEmail(
          newOrder.user.email,
          newOrder.user.name || 'Valued Customer',
          newOrder.orderId,
          newOrder.orderDetails,
          newOrder.totalAmount
        );
        console.log(`Order confirmation email sent to ${newOrder.user.email} for order #${newOrder.orderId}`);
      }
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      // Don't fail the order creation if email fails
    }

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Could not create order." });
  }
};

// Get all orders
const getAllOrders = async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query; // Added 'search' parameter
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const searchTerm = search.trim(); // Trim whitespace from search term

  if (
    isNaN(parsedPage) ||
    parsedPage < 1 ||
    isNaN(parsedLimit) ||
    parsedLimit < 1
  ) {
    return res
      .status(400)
      .json({
        error:
          "Invalid page or limit parameters. They must be positive integers.",
      });
  }

  const skip = (parsedPage - 1) * parsedLimit;

  let whereCondition = {};

  if (searchTerm) {
    // Build search conditions for different fields
    whereCondition = {
      OR: [
        {
          status: {
            contains: searchTerm,
            mode: "insensitive", // Case-insensitive search for status
          },
        },
        {
          userId: {
            contains: searchTerm, // Assuming userId could be searched directly
            mode: "insensitive",
          },
        },
        // Search within related orderDetails
        {
          orderDetails: {
            some: {
              // 'some' means at least one orderDetail matches the condition
              OR: [
                {
                  productName: {
                    contains: searchTerm,
                    mode: "insensitive",
                  },
                },
                {
                  sku: {
                    contains: searchTerm,
                    mode: "insensitive",
                  },
                },
                {
                  categoryName: {
                    contains: searchTerm,
                    mode: "insensitive",
                  },
                },
                {
                  sizeName: {
                    contains: searchTerm,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      ],
    };
  }

  try {
    const orders = await prisma.order.findMany({
      where: whereCondition, // Apply the search condition
      skip: skip,
      take: parsedLimit,
      include: {
        orderDetails: true,
        transaction: true,
        user: true, // Make sure you have a User model if you include this
      },
      orderBy: {
        createdAt: "desc", // Order by creation date, newest first
      },
    });

    const totalOrders = await prisma.order.count({
      where: whereCondition, // Count filtered orders for pagination metadata
    });
    const totalPages = Math.ceil(totalOrders / parsedLimit);

    res.status(200).json({
      data: orders,
      pagination: {
        totalItems: totalOrders,
        currentPage: parsedPage,
        itemsPerPage: parsedLimit,
        totalPages: totalPages,
        nextPage: parsedPage < totalPages ? parsedPage + 1 : null,
        prevPage: parsedPage > 1 ? parsedPage - 1 : null,
      },
    });
  } catch (error) {
    console.error("Error fetching orders with pagination and search:", error);
    
// Update order status and send appropriate email notification
const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, trackingInfo } = req.body;
  
  if (!orderId || !status) {
    return res.status(400).json({ error: "Order ID and status are required." });
  }
  
  try {
    // Get the order with user details before updating
    const existingOrder = await prisma.order.findUnique({
      where: { orderId: parseInt(orderId) },
      include: { user: true, orderDetails: true }
    });
    
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found." });
    }
    
    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { orderId: parseInt(orderId) },
      data: { 
        status,
        ...(trackingInfo && {
          trackingNumber: trackingInfo.trackingNumber,
          carrier: trackingInfo.carrier,
          trackingUrl: trackingInfo.trackingUrl
        })
      },
      include: { user: true, orderDetails: true }
    });
    
    // Send appropriate email based on new status
    if (existingOrder.user && existingOrder.user.email) {
      const customerEmail = existingOrder.user.email;
      const customerName = existingOrder.user.name || 'Valued Customer';
      
      try {
        switch (status) {
          case 'processing':
            await sendOrderProcessingEmail(customerEmail, customerName, orderId);
            break;
          case 'shipped':
            await sendOrderShippedEmail(
              customerEmail, 
              customerName, 
              orderId, 
              trackingInfo?.carrier || 'Shipping Partner',
              trackingInfo?.trackingNumber || 'N/A',
              trackingInfo?.trackingUrl || '#'
            );
            break;
          case 'delivered':
            await sendOrderDeliveredEmail(customerEmail, customerName, orderId);
            break;
          case 'cancelled':
            await sendOrderCancelledEmail(customerEmail, customerName, orderId);
            break;
        }
        console.log(`Order status email sent to ${customerEmail} for order #${orderId} (${status})`);
      } catch (emailError) {
        console.error(`Error sending order ${status} email:`, emailError);
        // Don't fail the status update if email fails
      }
    }
    
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Could not update order status." });
  }
};
    res.status(500).json({ error: "Could not fetch orders." });
  }
};

// Get a single order by ID
const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderDetails: true,
        transaction: true,
        user: true,
      },
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res.status(500).json({ error: "Could not fetch order." });
  }
};

// Update an order by ID
const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { status, totalAmount, transactionId } = req.body;

  try {
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        totalAmount,
        transactionId, // You might need to handle transaction updates separately based on your logic
      },
      include: {
        orderDetails: true,
        transaction: true,
        user: true,
      },
    });
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Could not update order." });
  }
};

// Delete an order by ID
const deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    // First, delete related OrderDetails and Transaction
    await prisma.orderDetail.deleteMany({
      where: { orderId: id },
    });
    await prisma.transaction.deleteMany({
      // Use deleteMany because transactionId is optional and might not be linked directly in a one-to-one strict relation in the DB
      where: { orderId: id },
    });

    const deletedOrder = await prisma.order.delete({
      where: { id },
    });
    res
      .status(200)
      .json({ message: "Order deleted successfully.", deletedOrder });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Could not delete order." });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, trackingNumber } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({ error: "Order ID and status are required" });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderId: parseInt(orderId) },
      include: {
        user: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updatedOrder = await prisma.order.update({
      where: { orderId: parseInt(orderId) },
      data: { 
        status,
        ...(trackingNumber && { trackingNumber })
      },
      include: {
        orderDetails: true,
        user: true,
      },
    });

    // Send appropriate email based on the new status
    if (order.user && order.user.email) {
      const customerName = order.user.name || 'Valued Customer';
      
      try {
        switch (status) {
          case 'processing':
            await sendOrderProcessingEmail(
              order.user.email,
              customerName,
              order.orderId
            );
            break;
          case 'shipped':
            await sendOrderShippedEmail(
              order.user.email,
              customerName,
              order.orderId,
              trackingNumber || 'Not available'
            );
            break;
          case 'delivered':
            await sendOrderDeliveredEmail(
              order.user.email,
              customerName,
              order.orderId
            );
            break;
          case 'cancelled':
            await sendOrderCancelledEmail(
              order.user.email,
              customerName,
              order.orderId
            );
            break;
        }
      } catch (emailError) {
        console.error(`Error sending status update email: ${emailError}`);
        // Don't fail the status update if email fails
      }
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Could not update order status." });
  }
};

const sendOrderEmail = async (req, res) => {
  const { body, to,subject,from = "shipping@brandsdiscounts.com" } = req.body;

  if (!body || !to || !subject) {
    return res.status(400).json({ error: "Body, to, and subject are required" });
  }

  try {
    
    await sendEmail({
      to,
      from,
      subject,
      body,
    });
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Could not send email." });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  sendOrderEmail,
};
