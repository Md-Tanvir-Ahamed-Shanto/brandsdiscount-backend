

require('dotenv').config();
const { Resend } = require('resend');
const ejs = require('ejs');
const path = require('path');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an email using Resend with an EJS template.
 * @param {string} to - Recipient email address.
 * @param {string} from - Sender email address (must be verified in Resend).
 * @param {string} subject - Email subject.
 * @param {string} templateName - Name of the EJS template file (e.g., 'welcome.ejs').
 * @param {object} templateData - Data to be passed to the EJS template.
 * @returns {Promise<object>} - Resend send email response.
 */
async function sendEmail(to, from, subject, templateName, templateData) {
    try {
        // Construct the full path to the EJS template
        const templatePath = path.join(__dirname, '..', 'templates', templateName);

        // Render the EJS template with the provided data
        const htmlContent = await ejs.renderFile(templatePath, templateData);

        // Send the email using Resend
        const data = await resend.emails.send({
            from: from,
            to: to,
            subject: subject,
            html: htmlContent,
        });
        
        console.log(`Email sent to ${to} (${templateName}):`, data);
        return data;
    } catch (error) {
        console.error(`Error sending email to ${to} (${templateName}):`, error);
        throw error; // Re-throw the error for the caller to handle
    }
}

/**
 * Send order confirmation email for Stripe payments
 */
const sendOrderConfirmationEmail = async ({
    email,
    customerName,
    orderId,
    orderItems,
    totalAmount,
    appliedPoints = 0
}) => {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.log('Resend API key not found, skipping email send');
            return { success: false, message: 'Email not configured' };
        }

        // Generate order items HTML
        const itemsHtml = orderItems.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>${item.name || 'Product'}</strong><br>
                    ${item.color ? `Color: ${item.color}<br>` : ''}
                    ${item.size ? `Size: ${item.size}<br>` : ''}
                    SKU: ${item.sku || 'N/A'}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                    ${item.quantity || 1}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    $${((item.salePrice || item.price) / 100).toFixed(2)}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    $${(((item.salePrice || item.price) * (item.quantity || 1)) / 100).toFixed(2)}
                </td>
            </tr>
        `).join('');

        const pointsDiscount = appliedPoints * 0.01;
        const subtotal = totalAmount / 100;
        const finalTotal = subtotal - pointsDiscount;

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Confirmation - Brands Discounts</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 28px;">Order Confirmation</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for your purchase!</p>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">Hello ${customerName || 'Valued Customer'},</h2>
                    
                    <p>We're excited to confirm that your order has been successfully placed and payment has been processed.</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                        <h3 style="margin-top: 0; color: #667eea;">Order Details</h3>
                        <p><strong>Order ID:</strong> #${orderId}</p>
                        <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>Customer Email:</strong> ${email}</p>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Items Ordered</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f9fa;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Product</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Order Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Subtotal:</strong></td>
                                <td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #eee;">$${subtotal.toFixed(2)}</td>
                            </tr>
                            ${appliedPoints > 0 ? `
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #28a745;"><strong>Points Discount (${appliedPoints} points):</strong></td>
                                <td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #eee; color: #28a745;">-$${pointsDiscount.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 12px 0; font-size: 18px; font-weight: bold; color: #667eea;"><strong>Total Paid:</strong></td>
                                <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: bold; color: #667eea;">$${finalTotal.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/account/orders" 
                           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            View Order Details
                        </a>
                    </div>
                    
                    <div style="text-align: center; color: #666; font-size: 14px;">
                        <p>Thank you for shopping with <strong>Brands Discounts</strong>!</p>
                        <p>If you have any questions, please contact us at <a href="mailto:support@brandsdiscounts.com" style="color: #667eea;">support@brandsdiscounts.com</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const result = await resend.emails.send({
            from: process.env.FROM_EMAIL || 'noreply@brandsdiscounts.com',
            to: email,
            subject: `Order Confirmation #${orderId} - Brands Discounts`,
            html: emailHtml
        });

        console.log('Order confirmation email sent successfully:', result.id);
        return { success: true, messageId: result.id };

    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { sendEmail, sendOrderConfirmationEmail };
