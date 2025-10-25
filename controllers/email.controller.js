const emailService = require('../tools/email'); // Import your email service functions

// Helper function for common error handling
const handleError = (res, error, message) => {
    console.error(message, error);
    res.status(500).json({ message: `${message}`, error: error.message });
};

// 1.1. Welcome Email (After Account Creation/Signup)
exports.sendWelcomeEmailController = async (req, res) => {
    const { customerName, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL; // Fallback to test email
    if (!recipient) {
        return res.status(400).json({ message: 'Recipient email is required.' });
    }
    try {
        await emailService.sendWelcomeEmail(recipient, customerName || 'Valued Customer');
        res.status(200).json({ message: `Welcome email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send welcome email');
    }
};

// 2.1. Customer Used $10 Offer
exports.sendLoyaltyEmailController = async (req, res) => {
    const { customerName, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient) {
        return res.status(400).json({ message: 'Recipient email is required.' });
    }
    try {
        await emailService.sendLoyaltyEmail(recipient, customerName || 'Valued Customer');
        res.status(200).json({ message: `Order confirmation (offer used) email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send loyalty email');
    }
};

// 2.2. Customer Did NOT Use $10 Offer
exports.sendAbandonedOfferEmailController = async (req, res) => {
    const { customerName, orderNumber, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient) {
        return res.status(400).json({ message: 'Recipient email is required.' });
    }
    try {
        await emailService.sendAbandonedOfferEmail(recipient, customerName || 'Valued Customer', orderNumber || 'BD-XXYYZZ');
        res.status(200).json({ message: `Order confirmation (offer not used) email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send abandoned offer email');
    }
};

// 3.1. Processing
exports.sendOrderProcessingEmailController = async (req, res) => {
    const { customerName, orderNumber, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient || !orderNumber) {
        return res.status(400).json({ message: 'Recipient email and order number are required.' });
    }
    try {
        await emailService.sendOrderProcessingEmail(recipient, customerName || 'Valued Customer', orderNumber);
        res.status(200).json({ message: `Order processing email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send order processing email');
    }
};

// Handling (from previous email.js, though not in your server.js route list)
exports.sendOrderHandlingEmailController = async (req, res) => {
    const { customerName, orderNumber, productName, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient || !orderNumber || !productName) {
        return res.status(400).json({ message: 'Recipient email, order number, and product name are required.' });
    }
    try {
        await emailService.sendOrderHandlingEmail(recipient, customerName || 'Valued Customer', orderNumber, productName);
        res.status(200).json({ message: `Order handling email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send order handling email');
    }
};


// 3.2. Shipped
exports.sendOrderShippedEmailController = async (req, res) => {
    const { customerName, orderNumber, carrier, trackingNumber, trackingLink, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient || !orderNumber || !trackingNumber) {
        return res.status(400).json({ message: 'Recipient email, order number, and tracking number are required.' });
    }
    try {
        await emailService.sendOrderShippedEmail(recipient, customerName || 'Valued Customer', orderNumber, carrier || 'USPS', trackingNumber, trackingLink || `https://example.com/track/${trackingNumber}`);
        res.status(200).json({ message: `Order shipped email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send order shipped email');
    }
};

// 3.3. Delivered
exports.sendOrderDeliveredEmailController = async (req, res) => {
    const { customerName, orderNumber, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient || !orderNumber) {
        return res.status(400).json({ message: 'Recipient email and order number are required.' });
    }
    try {
        await emailService.sendOrderDeliveredEmail(recipient, customerName || 'Valued Customer', orderNumber);
        res.status(200).json({ message: `Order delivered email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send order delivered email');
    }
};

// 3.4. Cancelled
exports.sendOrderCancelledEmailController = async (req, res) => {
    const { customerName, orderNumber, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient || !orderNumber) {
        return res.status(400).json({ message: 'Recipient email and order number are required.' });
    }
    try {
        await emailService.sendOrderCancelledEmail(recipient, customerName || 'Valued Customer', orderNumber);
        res.status(200).json({ message: `Order cancelled email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send order cancelled email');
    }
};

// 4.1. Password Reset Request
exports.sendForgotPasswordEmailController = async (req, res) => {
    const { email, customerName } = req.body; // Using 'email' for consistency with JWT logic
    const recipient = email || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient) {
        return res.status(400).json({ message: 'Email address is required for password reset.' });
    }
    try {
        await emailService.sendForgotPasswordEmail(recipient, customerName || 'Valued Customer');
        res.status(200).json({ message: `Password reset email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send password reset email');
    }
};

// 4.2. Password Change Confirmation
exports.sendPasswordChangeConfirmationEmailController = async (req, res) => {
    const { customerName, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient) {
        return res.status(400).json({ message: 'Recipient email is required.' });
    }
    try {
        await emailService.sendPasswordChangeConfirmationEmail(recipient, customerName || 'Valued Customer');
        res.status(200).json({ message: `Password change confirmation email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send password change confirmation email');
    }
};

// 5.1. Customer Inquiry Auto-Reply (to Customer)
exports.sendCustomerInquiryAutoReplyEmailController = async (req, res) => {
    const { customerName, originalCustomerMessage, toEmail } = req.body;
    const recipient = toEmail || process.env.TEST_RECIPIENT_EMAIL;
    if (!recipient || !originalCustomerMessage) {
        return res.status(400).json({ message: 'Recipient email and original message are required.' });
    }
    try {
        await emailService.sendCustomerInquiryAutoReplyEmail(recipient, customerName || 'Valued Customer', originalCustomerMessage);
        res.status(200).json({ message: `Customer inquiry auto-reply email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send customer inquiry auto-reply email');
    }
};

// 6.1. Platform Sale & Stock Removal Alert (to Admin)
exports.sendAdminPlatformSaleAlertController = async (req, res) => {
    const { adminEmail, orderNumber, platformName, sku, title, color, size, quantitySold, remainingStock, itemLocation } = req.body;
    const recipient = adminEmail || process.env.TEST_ADMIN_EMAIL; // Fallback for admin email
    if (!recipient || !orderNumber || !sku) {
        return res.status(400).json({ message: 'Admin email, order number, and SKU are required.' });
    }
    const data = {
        orderNumber: orderNumber || 'EXT1000',
        platformName: platformName || 'eBay',
        sku: sku,
        title: title || 'Product Title',
        color: color || 'N/A',
        size: size || 'N/A',
        quantitySold: quantitySold || 1,
        remainingStock: remainingStock || 0,
        itemLocation: itemLocation || 'Unknown'
    };
    try {
        await emailService.sendAdminPlatformSaleAlert(recipient, data);
        res.status(200).json({ message: `Admin platform sale alert email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send admin platform sale alert email');
    }
};

// 6.2. Physical Store Sale & Sync Confirmation (to Admin)
exports.sendAdminPhysicalStoreSaleConfirmationController = async (req, res) => {
    const { adminEmail, sku, title, quantitySold, remainingStock, itemLocation } = req.body;
    const recipient = adminEmail || process.env.TEST_ADMIN_EMAIL;
    if (!recipient || !sku) {
        return res.status(400).json({ message: 'Admin email and SKU are required.' });
    }
    const data = {
        sku: sku,
        title: title || 'Product Title',
        quantitySold: quantitySold || 1,
        remainingStock: remainingStock || 0,
        itemLocation: itemLocation || 'Unknown'
    };
    try {
        await emailService.sendAdminPhysicalStoreSaleConfirmation(recipient, data);
        res.status(200).json({ message: `Admin physical store sale confirmation email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send admin physical store sale confirmation email');
    }
};

// 6.3. Inventory Sync Failure Alert (to Admin)
exports.sendAdminInventorySyncFailureAlertController = async (req, res) => {
    const { adminEmail, sku, productName, platformName, errorMessage } = req.body;
    const recipient = adminEmail || process.env.TEST_ADMIN_EMAIL;
    if (!recipient || !sku || !platformName || !errorMessage) {
        return res.status(400).json({ message: 'Admin email, SKU, platform name, and error message are required.' });
    }
    const data = {
        sku: sku,
        productName: productName,
        platformName: platformName,
        errorMessage: errorMessage
    };
    try {
        await emailService.sendAdminInventorySyncFailureAlert(recipient, data);
        res.status(200).json({ message: `Admin inventory sync failure alert email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send admin inventory sync failure alert email');
    }
};

// 7.1. Order Update Email (from Admin Dashboard)
exports.sendOrderUpdateEmailController = async (req, res) => {
    const { toEmail, subject, customerName, orderNumber, message } = req.body;
    const recipient = toEmail;
    
    if (!recipient || !orderNumber || !message) {
        return res.status(400).json({ message: 'Recipient email, order number, and message are required.' });
    }
    
    try {
        // Use the generic email sending function or create a specific one in email service
        await emailService.sendCustomEmail(
            recipient,
            subject || `Update for your order ${orderNumber}`,
            message,
            {
                customerName: customerName || 'Valued Customer',
                orderNumber: orderNumber
            }
        );
        
        res.status(200).json({ message: `Order update email sent to ${recipient}` });
    } catch (error) {
        handleError(res, error, 'Failed to send order update email');
    }
};
