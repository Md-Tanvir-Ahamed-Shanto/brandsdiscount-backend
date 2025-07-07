require("dotenv").config();
let express = require("express");
var cors = require("cors");
let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
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
const { walmartOrderSync } = require("./services/walmartService");

let app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
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

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api", productSyncRoutes);
app.use("/api/ebay", ebayRoutes);
app.use("/api/woo-com", wooComRoutes);
app.use("/api/walmart", walmartRoutes)

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

app.get("/ebay/auth/cancel",async (req, res)=>{
  res.send("❌ eBay authentication cancelled.");
})

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

let isRunning = true;

cron.schedule("*/5 * * * *", async () => {
  if (isRunning) {
    console.log(`[${new Date().toISOString()}] Job already running, skipping.`);
    return;
  }

  isRunning = true;
  console.log(`[${new Date().toISOString()}] Job started.`);

  try {
    // ========== Order Sync Section ==========

    const [ebayOrders, ebayOrders2, ebayOrders3, wooOrders] = await Promise.all(
      [ebayOrderSync(), ebayOrderSync2(), ebayOrderSync3(), wooComOrderSync(), walmartOrderSync()]
    );

    console.log("✅ eBay Orders Synced:", ebayOrders.length);
    console.log("✅ eBay Orders 2 Synced:", ebayOrders2.length);
    console.log("✅ eBay Orders 3 Synced:", ebayOrders3.length);
    console.log("✅ WooCommerce Orders Synced:", wooOrders.length);
    console.log("✅ Walmart Orders Synced:", ebayOrders.length);
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
