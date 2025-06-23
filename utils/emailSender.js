// utils/emailSender.js

require('dotenv').config();
const AWS = require('aws-sdk');
const ejs = require('ejs');
const path = require('path');

// Configure AWS SES
// Ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION are set in your environment variables or .env file
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

/**
 * Sends an email using AWS SES with an EJS template.
 * @param {string} to - Recipient email address.
 * @param {string} from - Sender email address (must be verified in SES).
 * @param {string} subject - Email subject.
 * @param {string} templateName - Name of the EJS template file (e.g., 'welcome.ejs').
 * @param {object} templateData - Data to be passed to the EJS template.
 * @returns {Promise<object>} - SES send email response.
 */
async function sendEmail(to, from, subject, templateName, templateData) {
    try {
        // Construct the full path to the EJS template
        const templatePath = path.join(__dirname, '..', 'templates', templateName);

        // Render the EJS template with the provided data
        const htmlContent = await ejs.renderFile(templatePath, templateData);

        const params = {
            Destination: {
                ToAddresses: [to]
            },
            Message: {
                Body: {
                    Html: {
                        Charset: 'UTF-8',
                        Data: htmlContent
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: subject
                }
            },
            Source: from, // Verified sender email address
        };

        // Send the email
        const data = await ses.sendEmail(params).promise();
        console.log(`Email sent to ${to} (${templateName}):`, data);
        return data;
    } catch (error) {
        console.error(`Error sending email to ${to} (${templateName}):`, error);
        throw error; // Re-throw the error for the caller to handle
    }
}

module.exports = { sendEmail };
