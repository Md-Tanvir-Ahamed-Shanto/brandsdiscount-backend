

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

module.exports = { sendEmail };
