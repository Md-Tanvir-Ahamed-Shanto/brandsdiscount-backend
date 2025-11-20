// Update order status function
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { 
  sendOrderProcessingEmail, 
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail
} = require("../tools/email.js");

const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({ error: "Order ID and status are required" });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status
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
              order.id,
              'Not available'
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

module.exports = updateOrderStatus;