require("dotenv").config(); 
const { Resend } = require("resend");
const ejs = require("ejs");
const path = require("path");
const jwt = require("jsonwebtoken"); 

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

const templatesDir = path.join(__dirname, "..", "emailTemplates");

async function renderEmailTemplate(templateName, data) {
  try {
    const templatePath = path.join(templatesDir, templateName);
    return await ejs.renderFile(templatePath, data);
  } catch (error) {
    console.error(`Error rendering EJS template ${templateName}:`, error);
    throw error;
  }
}

async function sendEmail(to, from, subject, htmlContent) {
  try {
    const data = await resend.emails.send({
      from: "noreply@brandsdiscounts.com",
      to: to,
      subject: subject,
      html: htmlContent,
    });
    
    console.log(
      `Email sent successfully to ${to} with subject: "${subject}"`,
      data
    );
    return data;
  } catch (error) {
    console.error(
      `Error sending email to ${to} with subject "${subject}":`,
      error
    );
    throw error; // Re-throw the error for the caller to handle
  }
}

// Custom email function for order updates from admin dashboard
async function sendCustomEmail(to, subject, message, data = {}) {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${process.env.FRONTEND_URL || 'https://brandsdiscounts.com'}/logo.png" alt="Brands Discounts Logo" style="max-width: 150px;">
        </div>
        <h2 style="color: #333;">Order Update</h2>
        <p>Hello ${data.customerName || 'Valued Customer'},</p>
        <p>Regarding your order #${data.orderNumber}:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p>If you have any questions, please reply to this email or contact our customer support.</p>
        <p>Thank you for shopping with us!</p>
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Brands Discounts. All rights reserved.</p>
        </div>
      </div>
    `;
    
    return await sendEmail(
      to,
      "noreply@brandsdiscounts.com",
      subject,
      htmlContent
    );
  } catch (error) {
    console.error('Error sending custom email:', error);
    throw error;
  }
}



async function sendWelcomeEmail(customerEmail, customerName) {
  const subject = "Welcome to Brands Discounts! Your Style Journey Begins Now.";
  const htmlContent = await renderEmailTemplate("welcome.ejs", {
    customerName,
  });
  await sendEmail(
    customerEmail,
    "welcome@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

const sendLoyaltyEmail = async (toEmail, customerName) => {
  const subject =
    "🎉 Your Order is Confirmed & Welcome to the Loyalty Program!";
  const htmlContent = await renderEmailTemplate("loyalty.ejs", {
    customerName,
  });
  await sendEmail(
    toEmail,
    "orders@brandsdiscounts.com",
    subject,
    htmlContent
  );
};

const sendAbandonedOfferEmail = async (toEmail, customerName, orderNumber) => {
  const subject =
    "⚡ We Noticed You Left the $10 Offer Behind – Let’s Make It Happen Next Time!";
  const htmlContent = await renderEmailTemplate("abandoned_offer.ejs", {
    customerName,
    orderNumber,
  });
  await sendEmail(
    toEmail,
    "orders@brandsdiscounts.com",
    subject,
    htmlContent
  );
};

async function sendOrderProcessingEmail(toEmail, customerName, orderNumber) {
  const subject = `Your Brands Discounts Order #${orderNumber} is Processing`;
  const htmlContent = await renderEmailTemplate("order_processing_status.ejs", {
    customerName,
    orderNumber,
  });
  await sendEmail(
    toEmail,
    "shipping@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendOrderHandlingEmail(
  toEmail,
  customerName,
  orderNumber,
  productName
) {
  const subject = `Update on Your Brands Discounts Order #${orderNumber}`;
  const htmlContent = await renderEmailTemplate("order_handling_status.ejs", {
    customerName,
    orderNumber,
    productName,
  });
  await sendEmail(
    toEmail,
    "shipping@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendOrderShippedEmail(
  toEmail,
  customerName,
  orderNumber,
  carrier,
  trackingNumber,
  trackingLink
) {
  const subject = `🚚 It's Shipped! Your Brands Discounts Order #${orderNumber} is On Its Way!`;
  const htmlContent = await renderEmailTemplate("order_shipped_status.ejs", {
    customerName,
    orderNumber,
    carrier,
    trackingNumber,
    trackingLink,
  });
  await sendEmail(
    toEmail,
    "shipping@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendOrderDeliveredEmail(toEmail, customerName, orderNumber) {
  const subject = `🎉 Delivered! Your Brands Discounts Order #${orderNumber} Has Arrived!`;
  const htmlContent = await renderEmailTemplate("order_delivered_status.ejs", {
    customerName,
    orderNumber,
  });
  await sendEmail(
    toEmail,
    "shipping@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendOrderCancelledEmail(toEmail, customerName, orderNumber) {
  const subject = `Your Brands Discounts Order #${orderNumber} has been cancelled`;
  const htmlContent = await renderEmailTemplate("order_cancelled.ejs", {
    customerName,
    orderNumber,
  });
  await sendEmail(
    toEmail,
    "shipping@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendForgotPasswordEmail(email, customerName) {
  // Ensure JWT_SECRET and CLIENT_URL are set in your .env file
  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const resetLink = `${process.env.CLIENT_URL}/authroute/reset-password?token=${token}`; // Assuming a reset-password route

  const subject = "Reset Your Brands Discounts Password";
  const htmlContent = await renderEmailTemplate("forgot_password.ejs", {
    resetLink,
    customerName,
  });
  await sendEmail(
    email,
    "accounts@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendPasswordChangeConfirmationEmail(toEmail, customerName) {
  const subject = "Your Brands Discounts Password Has Been Updated";
  const htmlContent = await renderEmailTemplate(
    "password_change_confirmation.ejs",
    { customerName }
  );
  await sendEmail(
    toEmail,
    "accounts@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendCustomerInquiryAutoReplyEmail(
  toEmail,
  customerName,
  originalCustomerMessage
) {
  const subject = "Re: Your Inquiry to Brands Discounts";
  const htmlContent = await renderEmailTemplate(
    "customer_inquiry_auto_reply.ejs",
    { customerName, originalCustomerMessage }
  );
  await sendEmail(
    toEmail,
    "support@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendAdminPlatformSaleAlert(adminEmail, data) {
  const subject = `🔴 ACTION REQUIRED: Remove Item from Physical Store - Order #${data.orderNumber} on ${data.platformName}`;
  const htmlContent = await renderEmailTemplate(
    "admin_platform_sale_stock_removal.ejs",
    data
  );
  await sendEmail(
    adminEmail,
    "noreply@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendAdminPhysicalStoreSaleConfirmation(adminEmail, data) {
  const subject = `✅ Physical Store Sale Confirmed & Sync Started - SKU: ${data.sku}`;
  const htmlContent = await renderEmailTemplate(
    "admin_physical_store_sale_sync_confirmation.ejs",
    data
  );
  await sendEmail(
    adminEmail,
    "noreply@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendAdminInventorySyncFailureAlert(adminEmail, data) {
  const subject = `⚠️ URGENT: Inventory Sync Failure for SKU: ${data.sku}`;
  const htmlContent = await renderEmailTemplate(
    "admin_inventory_sync_failure.ejs",
    data
  );
  await sendEmail(
    adminEmail,
    "noreply@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

// Add order confirmation email function
async function sendOrderConfirmationEmail(toEmail, customerName, orderNumber, orderDetails, totalAmount) {
  const subject = `🎉 Your Brands Discounts Order #${orderNumber} is Confirmed!`;
  const htmlContent = await renderEmailTemplate("order_confirmation.ejs", {
    customerName,
    orderNumber,
    orderDetails,
    totalAmount,
    orderDate: new Date().toLocaleDateString()
  });
  await sendEmail(
    toEmail,
    "orders@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

// New email functions for the 14 templates
async function sendNewsletterOptInEmail(customerEmail) {
  const subject = "✨ Thanks for Subscribing to the Style Insider List!";
  const htmlContent = await renderEmailTemplate("newsletter_optin.ejs", {});
  await sendEmail(
    customerEmail,
    "welcome@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendOrderOfferUsedEmail(customerEmail, customerName, orderNumber) {
  const subject = "🎉 Welcome to Brands Discounts – Your $10 First Item & Free Shipping Awaits!";
  const htmlContent = await renderEmailTemplate("order_offer_used.ejs", {
    customerName,
    orderNumber
  });
  await sendEmail(
    customerEmail,
    "orders@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

async function sendOrderOfferNotUsedEmail(customerEmail, customerName, orderNumber) {
  const subject = "We Noticed You Left the $10 Offer Behind – Let's Make It Happen Next Time!";
  const htmlContent = await renderEmailTemplate("order_offer_not_used.ejs", {
    customerName,
    orderNumber
  });
  await sendEmail(
    customerEmail,
    "orders@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendLoyaltyEmail,
  sendAbandonedOfferEmail,
  sendOrderConfirmationEmail,
  sendOrderProcessingEmail,
  sendOrderHandlingEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendForgotPasswordEmail,
  sendPasswordChangeConfirmationEmail,
  sendCustomerInquiryAutoReplyEmail,
  sendAdminPlatformSaleAlert,
  sendAdminPhysicalStoreSaleConfirmation,
  sendAdminInventorySyncFailureAlert,
  // New email functions
  sendNewsletterOptInEmail,
  sendOrderOfferUsedEmail,
  sendOrderOfferNotUsedEmail,
  sendCustomEmail
};
