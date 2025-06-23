const express = require('express');
const emailRoutes = express.Router();
const emailController = require('../controllers/email.controller'); // Import the controller

// --- Customer-facing Emails ---
emailRoutes.post('/welcome', emailController.sendWelcomeEmailController);
emailRoutes.post('/loyalty-offer-used', emailController.sendLoyaltyEmailController);
emailRoutes.post('/abandoned-offer', emailController.sendAbandonedOfferEmailController);

// --- Order Status Emails ---
emailRoutes.post('/order-processing', emailController.sendOrderProcessingEmailController);
emailRoutes.post('/order-handling', emailController.sendOrderHandlingEmailController); // Added route for handling status
emailRoutes.post('/order-shipped', emailController.sendOrderShippedEmailController);
emailRoutes.post('/order-delivered', emailController.sendOrderDeliveredEmailController);
emailRoutes.post('/order-cancelled', emailController.sendOrderCancelledEmailController);

// --- Account Management Emails ---
emailRoutes.post('/password-reset-request', emailController.sendForgotPasswordEmailController);
emailRoutes.post('/password-change-confirmation', emailController.sendPasswordChangeConfirmationEmailController);

// --- Customer Service Emails ---
emailRoutes.post('/customer-inquiry-auto-reply', emailController.sendCustomerInquiryAutoReplyEmailController);

// --- Admin Notification Emails ---
emailRoutes.post('/admin/platform-sale-alert', emailController.sendAdminPlatformSaleAlertController);
emailRoutes.post('/admin/physical-store-sale-confirmation', emailController.sendAdminPhysicalStoreSaleConfirmationController);
emailRoutes.post('/admin/inventory-sync-failure-alert', emailController.sendAdminInventorySyncFailureAlertController);

module.exports = emailRoutes;
