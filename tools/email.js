const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendLoyaltyEmail = async (toEmail, customerName) => {
  console.log("enter loyalty email");
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject:
      "🎉 Welcome to Brands Discounts – Your $10 First Item & Free Shipping Awaits!",
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #007bff;">Hi ${customerName},</h2>
  
          <p>Thank you for making your first purchase with us! 🎉</p>
          <p>We’re excited that you took advantage of our exclusive offer – any item for just <strong>$10</strong> when you spend <strong>$60</strong> or more.</p>
  
          <h3>🎁 How Our Loyalty Program Works:</h3>
          <ul>
            <li>🔹 <strong>Earn Points:</strong> For every $1 spent (excluding shipping), you earn 1 point.</li>
            <li>🔹 <strong>Redeem Rewards:</strong> 1 point equals a $0.01 discount on future orders.</li>
          </ul>
  
          <p>Visit your <a href="https://yourwebsite.com/dashboard" style="color: #007bff;">dashboard</a> anytime to track your loyalty points, order status, and exclusive rewards.</p>
  
          <p>Welcome to the <strong>Brands Discounts</strong> family – happy shopping! 🛍️</p>
  
          <p>Best regards,</p>
          <p><strong>The Brands Discounts Team</strong></p>
  
          <hr>
          <p style="font-size: 12px; color: gray;">
            For any questions, please reach us at <a href="mailto:hello@brandsdiscounts.com">hello@brandsdiscounts.com</a>.
          </p>
        </div>
      `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent successfully to", toEmail);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};

const sendAbandonedOfferEmail = async (toEmail, customerName) => {
  console.log("enter abandoned loyalty email", toEmail, customerName);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject:
      "⚡ We Noticed You Left the $10 Offer Behind – Let’s Make It Happen Next Time!",
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #007bff;">Hi ${customerName},</h2>
  
          <p>Thank you for your recent purchase at <strong>Brands Discounts</strong>! 🎉</p>
          <p>We noticed that you removed the <strong>$10 first item offer</strong> from your cart this time. But don’t worry—you can still take advantage of this exclusive deal on your next order! 💸</p>
  
          <h3>🎁 How to Claim Your Offer:</h3>
          <p>When you spend <strong>$60 or more</strong>, you can get <strong>any item for just $10</strong>!</p>
          <p>Plus, you'll be <strong>automatically enrolled</strong> in our loyalty program, earning points towards future discounts.</p>
  
          <p>🛍️ <a href="https://yourwebsite.com/shop" style="color: #007bff; text-decoration: none; font-weight: bold;">Shop Now & Claim Your Deal</a></p>
  
          <p>If you have any questions or need assistance, feel free to reach out.</p>
  
          <p>We hope to see you back soon!</p>
  
          <p>Warm regards,</p>
          <p><strong>The Brands Discounts Team</strong></p>
  
          <hr>
          <p style="font-size: 12px; color: gray;">
            Need help? Contact us at <a href="mailto:hello@brandsdiscounts.com">hello@brandsdiscounts.com</a>.
          </p>
        </div>
      `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Abandoned offer email sent successfully to", toEmail);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};

const sendForgotPasswordEmail = async (email) => {
  console.log("sending verification email");
  const token = jwt.sign({ email }, process.env.JWT_SECRET);
  const url = `${process.env.CLIENT_URL}/authroute/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset your password",
    html: `<p>Please update your password by clicking <a href="${url}">here</a>.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  sendAbandonedOfferEmail,
  sendLoyaltyEmail,
  sendForgotPasswordEmail,
};
