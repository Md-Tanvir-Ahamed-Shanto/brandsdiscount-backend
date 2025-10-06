// Test script to verify AWS SES email functionality
require('dotenv').config();
const { sendEmail } = require('./utils/emailSender');

async function testEmailSending() {
  try {
    // Enter your test email address here
    const to = 'mdtanvirahamedshanto@gmail.com'; // Replace with your actual email for testing
    const from = 'brandsoverstockllc@gmail.com'; // This must be a verified email in your AWS SES account
    const subject = 'AWS SES Test Email';
    const templateName = 'welcome.ejs'; // Using an existing template
    const templateData = {
      customerName: 'Test User',
      message: 'This is a test email to verify AWS SES configuration'
    };

    console.log('Attempting to send test email...');
    const result = await sendEmail(to, from, subject, templateName, templateData);
    console.log('Email sent successfully!');
    console.log('Message ID:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Execute the test function
testEmailSending()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed:', err));

// Run the test
testEmailSending();