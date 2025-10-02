require("dotenv").config();
let express = require("express");
var cors = require("cors");
let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
let favicon = require("serve-favicon");
const bodyParser = require("body-parser");
let cron = require("node-cron");
const createError = require("http-errors");
let usersRouter = require("./routes/users");
let authRouter = require("./routes/auth");
let productRouter = require("./routes/product");
let sizeRouter = require("./routes/size");
let categoryRouter = require("./routes/category");
let ebayRouter = require("./routes/ebay");
let ebayRouter2 = require("./routes/ebay2");
let ebayRouter3 = require("./routes/ebay3");
let orderRouter = require("./routes/order");
let webhookRouter = require("./webhook/ebayWebhook");
let sheinRouter = require("./routes/shein");
const { wooComOrderSync } = require("./services/wooComService");
const productSyncRoutes = require("./routes/productSync.route");
const syncLogRouter = require('./routes/syncLog.route');

const { productRoutes } = require("./routes/product.route");
const orderRoutes = require("./routes/order.route");
const categoryRoutes = require("./routes/category.route");
const emailRoutes = require("./routes/email.route");
const {
  ebayOrderSync,
  ebayOrderSync2,
  ebayOrderSync3,
} = require("./services/ebayOrderSync");
const ebayRoutes = require("./routes/ebay.routes");
const { getAccessToken } = require("./tools/ebayAuth");
const wooComRoutes = require("./routes/wooCom.route");
const { getAccessToken2 } = require("./tools/ebayAuth2");
const { getAccessToken3 } = require("./tools/ebayAuth3");
const walmartRoutes = require("./routes/walmart.routes");
const { walmartOrderSync, walmartOrderSync2 } = require("./services/walmartService");
const { exchangeSheinTempToken, generateSheinAuthUrl } = require("./services/shein/sheinAuthService");
const sheinRoutes = require("./routes/shein.route");
const notificationRoutes = require("./routes/notification.routes");

let app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "uploads")));
// Use body-parser to handle raw XML payloads
app.use(bodyParser.text({ type: "text/xml" }));
app.use(bodyParser.text({ type: "application/xml" }));

const corsOptions = {
  origin: "*",
};

// Set EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api", productSyncRoutes);
app.use("/api/ebay", ebayRoutes);
app.use("/api/woo-com", wooComRoutes);
app.use("/api/walmart", walmartRoutes)
app.use("/api/shein", sheinRoutes)
app.use("/api/sync-logs", syncLogRouter)


app.get("/ebay/auth/callback", async (req, res) => {
  try {
    const rawCode = req.query.code;
    const code = decodeURIComponent(rawCode);

    console.log("Decoded eBay Code:", code);

    await getAccessToken(code);

    res.send("✅ Access token saved successfully!");
  } catch (err) {
    console.error("Error in eBay callback:", err.message);
    res.status(500).send("❌ Failed to get eBay token");
  }
});

app.get("/ebay2/auth/callback", async (req, res) => {
  try {
    const rawCode = req.query.code;
    const code = decodeURIComponent(rawCode);

    console.log("Decoded eBay Code:", code);

    await getAccessToken2(code);

    res.send("✅ Access token saved successfully!");
  } catch (err) {
    console.error("Error in eBay callback:", err.message);
    res.status(500).send("❌ Failed to get eBay token");
  }
});


app.get("/ebay3/auth/callback", async (req, res) => {
  try {
    const rawCode = req.query.code;
    const code = decodeURIComponent(rawCode);

    console.log("Decoded eBay Code:", code);

    await getAccessToken3(code);

    res.send("✅ Access token saved successfully!");
  } catch (err) {
    console.error("Error in eBay callback:", err.message);
    res.status(500).send("❌ Failed to get eBay token");
  }
});

app.get('/shein/auth/callback', async (req, res) => {
  const { tempToken, state, error, error_description } = req.query;

  if (error) {
    console.error(`Shein Authorization Error: ${error} - ${error_description || 'No description'}`);
    return res.redirect('/auth/error?message=Shein authorization failed');
  }
  if (!tempToken) {
    console.error('Shein callback: No tempToken received.');
    return res.redirect('/auth/error?message=Shein authorization failed: Missing token');
  }

  try {
    await exchangeSheinTempToken(tempToken);
    res.redirect(`/auth/success?platform=shein&state=${state || ''}`);
  } catch (err) {
    console.error('❌ Error in Shein auth callback:', err.message);
    res.redirect(`/auth/error?message=Shein authorization failed: ${encodeURIComponent(err.message)}`);
  }
});

app.get('/shein/auth', (req, res) => {
  const state = crypto.randomUUID(); // Generate a unique state for CSRF protection
  // You should store this state in the user's session or a cookie
  // to verify it when Shein redirects back.
  const authUrl = generateSheinAuthUrl(state);
  res.redirect(authUrl);
});

app.get("/ebay/auth/cancel",async (req, res)=>{
  res.send("❌ eBay authentication cancelled.");
})
app.get("/shein/callback", async (req, res) => {
  const { tempToken } = req.query;
  if (!tempToken) return res.status(400).send("Missing tempToken");
  const tokens = await exchangeSheinTempToken(tempToken);
  // Save openKeyId & secretKey…
  res.send("Authorized!");
});

app.get("/auth/error", async (req,res)=>{
  try {
    res.status(404).json({message:"Feild"})
  } catch (error) {
    console.log("Error",error)
    res.status(500).json({message:"Someting Went Wrong"})
  }
})

app.get('/shein/oauth/callback', async (req, res) => {
  const { tempToken, state, error, error_description } = req.query;

  // Optional: Verify the 'state' parameter against what you stored
  // if (state !== req.session.sheinAuthState) {
  //   return res.status(403).send('CSRF attack detected or invalid state.');
  // }
  // delete req.session.sheinAuthState;

  if (error) {
    console.error('Shein Authorization Error:', error_description || error);
    return res.status(400).send(`Shein authorization failed: ${error_description || error}`);
  }

  if (!tempToken) {
    return res.status(400).send('tempToken not received from Shein authorization.');
  }

  try {
    // Call your service function with the obtained tempToken
    const { openKeyId, encryptedSecretKey } = await sheinAuthService.exchangeSheinTempToken(tempToken);
    console.log('Shein tokens exchanged successfully!');
    // Redirect to a success page or send a success response
    res.status(200).json({
      message: 'Shein authorization successful and tokens exchanged.',
      openKeyId: openKeyId, // You might not want to send these back to client directly
      encryptedSecretKey: encryptedSecretKey
    });
  } catch (err) {
    console.error('Error exchanging Shein tempToken:', err);
    res.status(500).send('Failed to exchange Shein temporary token.');
  }
});

app.get('/shein/authorize', (req, res) => {
  // You might want to generate a 'state' parameter to prevent CSRF attacks
  const state = Math.random().toString(36).substring(2, 15);
  // Store this state in session or database linked to the user for verification later
  // req.session.sheinAuthState = state; // Example if using express-session

  const authUrl = generateSheinAuthUrl(state);
  res.redirect(authUrl); // Redirect the user to Shein's authorization page
});

app.use("/userroute", usersRouter);
app.use("/authroute", authRouter);
app.use("/productroute", productRouter);
app.use("/sizeroute", sizeRouter);
app.use("/categoryroute", categoryRouter);
app.use("/ebay", ebayRouter);
app.use("/ebay2", ebayRouter2);
app.use("/ebay3", ebayRouter3);
app.use("/shein", sheinRouter);
app.use("/order", orderRouter);
app.use("/webhook", webhookRouter);
app.use("/api", require("./routes/import"));

let isRunning = false;

cron.schedule("*/5 * * * *", async () => {
  if (isRunning) {
    console.log(`[${new Date().toISOString()}] Job already running, skipping.`);
    return;
  }

  isRunning = true;
  console.log(`[${new Date().toISOString()}] Job started.`);

  try {
    // ========== Order Sync Section ==========

    const [ebayOrders, ebayOrders2, ebayOrders3, walmartOrders, walmartOrders2] = await Promise.all(
      [ebayOrderSync(), ebayOrderSync2(), ebayOrderSync3(), walmartOrderSync(), walmartOrderSync2()]
    );

    console.log("✅ eBay Orders Synced:", ebayOrders.length);
    console.log("✅ eBay Orders 2 Synced:", ebayOrders2.length);
    console.log("✅ eBay Orders 3 Synced:", ebayOrders3.length);
    console.log("✅ Walmart Orders Synced:", walmartOrders.length);
    console.log("✅ Walmart2 Orders Synced:", walmartOrders2.length);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Job execution error:`,
      error.message
    );
  } finally {
    isRunning = false;
    console.log(`[${new Date().toISOString()}] Job finished.`);
  }
});

app.use((req, res, next) => {
  const err = createError(404, `Not Found: ${req.originalUrl}`);
  next(err);
});

// Global Error Handler (for API)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  console.error(
    `[${new Date().toISOString()}] ❌ Error:`,
    err.stack || err.message
  );

  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(req.app.get("env") === "development" && { stack: err.stack }),
  });
});

module.exports = app;
