require("dotenv").config(); 
const AWS = require("aws-sdk");
const ejs = require("ejs");
const path = require("path");
const jwt = require("jsonwebtoken"); 

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

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

async function sendAwsSesEmail(to, from, subject, htmlContent) {
  const params = {
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlContent,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: from, // Verified sender email address in AWS SES
  };

  try {
    const data = await ses.sendEmail(params).promise();
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

async function sendWelcomeEmail(customerEmail, customerName) {
  const subject = "Welcome to Brands Discounts! Your Style Journey Begins Now.";
  const htmlContent = await renderEmailTemplate("welcome.ejs", {
    customerName,
  });
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
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
  await sendAwsSesEmail(
    adminEmail,
    "noreply@brandsdiscounts.com",
    subject,
    htmlContent
  );
}

module.exports = {
  sendWelcomeEmail,
  sendLoyaltyEmail,
  sendAbandonedOfferEmail,
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
};
