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

async function sendWelcomeEmail(customerEmail, customerName) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: "Welcome to the Brands Discounts Insider List! ✨",
    html: `
      <p>Hi ${customerName},</p>
      <p>Thanks for joining the <strong>Brands Discounts Insider List</strong>! Get ready for exclusive access to the latest trends in women's fashion, style tips, early sale notifications, and special offers delivered right to your inbox.</p>
      <p>As a special welcome, remember you can get your first item for just <strong>$10</strong> on your initial order of <strong>$60 or more</strong>, plus enjoy <strong>free domestic shipping</strong>! (Just sign up or log in before adding items to your cart).</p>
      <p><a href="https://brandsdiscounts.com">Shop New Arrivals Now</a></p>
      <p>We're thrilled to have you!</p>
      <p>Best regards,<br/>The Brands Discounts Team</p>
      <p>Stay Connected & Stylish:</p>
      <ul>
        <li><a href="https://www.instagram.com/brandsdiscounts.official">Instagram</a></li>
        <li><a href="https://www.youtube.com/@BrandsDiscounts/">YouTube</a></li>
        <li><a href="https://www.facebook.com/brandsdiscountsusa/">Facebook</a></li>
        <li><a href="https://www.pinterest.com/brandsdiscountsofficial/">Pinterest</a></li>
        <li><a href="https://www.tiktok.com/@brandsdiscounts.com">TikTok</a></li>
      </ul>
      <p style="font-size: 12px; color: gray;">© 2025 Brands Discounts<br/>8 The Green, Dover, DE, 19901, USA</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

const templates = {
  processing: ({ customerName, orderNumber }) => ({
    subject: `Your Brands Discounts Order #${orderNumber} is Processing`,
    html: `
      <p>Hi ${customerName},</p>
      <p>Just a quick update: Your recent order <strong>#${orderNumber}</strong> is now being processed by our team.</p>
      <p>We're carefully checking and preparing your items. We'll let you know as soon as it moves to the next stage (typically handling/preparation for shipment).</p>
      <p><a href="https://brandsdiscounts.com/account/orders/${orderNumber}">Track My Order</a></p>
      <p>Thanks for your patience!</p>
      ${signatureHtml()}
    `,
  }),

  handling: ({ customerName, orderNumber, productName }) => ({
    subject: `Update on Your Brands Discounts Order #${orderNumber}`,
    html: `
      <p>Hi ${customerName},</p>
      <p>Good news! Your order <strong>#${orderNumber}</strong> is now being handled by our fulfillment team.</p>
      <p>This means we're picking your item(s) (like that lovely ${productName}), packing them carefully, and preparing them for shipment.</p>
      <p><a href="https://brandsdiscounts.com/account/orders/${orderNumber}">Track My Order</a></p>
      <p>You're one step closer to receiving your new styles!</p>
      ${signatureHtml()}
    `,
  }),

  shipped: ({
    customerName,
    orderNumber,
    carrier,
    trackingNumber,
    trackingLink,
  }) => ({
    subject: `It's Shipped! Your Brands Discounts Order #${orderNumber} is On Its Way! 🚚`,
    html: `
      <p>Hi ${customerName},</p>
      <p>Get excited! Your order <strong>#${orderNumber}</strong> has shipped and is officially on its way to you.</p>
      <p><strong>Carrier:</strong> ${carrier}<br/>
      <strong>Tracking Number:</strong> <a href="${trackingLink}">${trackingNumber}</a> (Click to track!)</p>
      <p>Please allow 24–48 hours for tracking to become active.</p>
      <p><a href="https://brandsdiscounts.com/account/orders/${orderNumber}">View Order in Account</a></p>
      ${signatureHtml()}
    `,
  }),

  delivered: ({ customerName, orderNumber }) => ({
    subject: `Delivered! Your Brands Discounts Order #${orderNumber} Has Arrived! 🎉`,
    html: `
      <p>Hi ${customerName},</p>
      <p>Great news! Tracking shows your order <strong>#${orderNumber}</strong> was successfully delivered.</p>
      <p>We hope you're already enjoying your new items! If you used the $10 offer, your loyalty points have been added.</p>
      <p><a href="https://brandsdiscounts.com/account/dashboard">Go to My Dashboard</a></p>
      <p>Love your look? Tag <strong>@brandsdiscounts.official</strong> on Instagram with <strong>#BrandsDiscountsStyle</strong> to be featured!</p>
      <p>If there are any issues, contact us at <a href="mailto:info@brandsdiscounts.com">info@brandsdiscounts.com</a>.</p>
      ${signatureHtml()}
    `,
  }),
};

function signatureHtml() {
  return `
    <p>Warmly,<br/>The Brands Discounts Team</p>
    <p>Stay Connected & Stylish:</p>
    <ul>
      <li><a href="https://www.instagram.com/brandsdiscounts.official">Instagram</a></li>
      <li><a href="https://www.youtube.com/@BrandsDiscounts/">YouTube</a></li>
      <li><a href="https://www.facebook.com/brandsdiscountsusa/">Facebook</a></li>
      <li><a href="https://www.pinterest.com/brandsdiscountsofficial/">Pinterest</a></li>
      <li><a href="https://www.tiktok.com/@brandsdiscounts.com">TikTok</a></li>
    </ul>
    <p style="font-size: 12px; color: gray;">© 2025 Brands Discounts<br/>8 The Green, Dover, DE, 19901, USA</p>
    <p>
      <a href="https://brandsdiscounts.com/returns">Return Policy</a> | 
      <a href="https://brandsdiscounts.com/privacy">Privacy Policy</a>
    </p>
  `;
}

async function sendOrderStatusEmail({ to, status, data }) {
  const template = templates[status];
  if (!template) throw new Error("Invalid order status");

  const { subject, html } = template(data);

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}

module.exports = {
  sendAbandonedOfferEmail,
  sendLoyaltyEmail,
  sendForgotPasswordEmail,
  sendOrderStatusEmail,
  sendWelcomeEmail,
};
