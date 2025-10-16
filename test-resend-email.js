require('dotenv').config();
// Import the email module and access the sendEmail function directly
const emailModule = require('./tools/email');
const sendEmail = emailModule.sendEmail;

async function testResendEmail() {
  try {
    console.log('Testing Resend email service...');
    console.log('API Key:', process.env.RESEND_API_KEY.substring(0, 5) + '...');
    
    // Test sending a simple email
    const result = await sendEmail(
      'test@example.com', // Replace with your test email
      'noreply@brandsdiscounts.com',
      'Test Email from Resend',
      '<h1>Test Email</h1><p>This is a test email sent using Resend.</p>'
    );
    
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

testResendEmail();