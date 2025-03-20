require("dotenv").config(); // load .env variables

const { DATABASE_URL, SECRET, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER } =
  process.env;

let createError = require("http-errors");
let express = require("express");
var cors = require("cors");
let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
let session = require("express-session");
const bodyParser = require("body-parser");

const { Client } = require("basic-ftp");

let usersRouter = require("./routes/users");
let authRouter = require("./routes/auth");
let productRouter = require("./routes/product");
let sizeRouter = require("./routes/size");
let categoryRouter = require("./routes/category");
let ebayRouter = require("./routes/ebay");
let webhookRouter = require("./webhook/ebayWebhook");

const nodemailer = require("nodemailer");
let cron = require("node-cron");

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

// const whitelist = process.env.WHITELISTED_DOMAINS
//   ? process.env.WHITELISTED_DOMAINS.split(",")
//   : [];

// console.log(whitelist);

const corsOptions = {
  // origin: function (origin, callback) {
  //   if (!origin || whitelist.indexOf(origin) !== -1) {
  //     console.log("valid req");
  //     callback(null, true);
  //   } else {
  //     callback(new Error("Not allowed by CORS"));
  //   }
  // },
  origin: "*",
  credentials: true,
};

app.use(cors(corsOptions));

app.use("/userroute", usersRouter);
app.use("/authroute", authRouter);
app.use("/productroute", productRouter);
app.use("/sizeroute", sizeRouter);
app.use("/categoryroute", categoryRouter);
app.use("/ebay", ebayRouter);
app.use("/webhook", webhookRouter);

// Serve the Checkout Page
app.get("/ebayPurchase", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "ebayPurchase.html"));
});

// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });

// app.use(function (err, req, res, next) {
//   console.error(err.stack); // Logs full error stack
//   res.status(err.status || 500).json({
//     error: err.message || "Internal Server Error",
//   });
// });

app.use(function (req, res, next) {
  const err = createError(404, `Not Found: ${req.originalUrl}`);
  console.error(err.message); // Log the error in console
  res.status(404).json({ error: err.message }); // Send a JSON response
});
/* Recommendation email */

// Initialize a lock flag
let isRunning = false;

cron.schedule("*/5 * * * * *", async () => {
  if (isRunning) {
    // console.log("Job is already running, skipping this execution...");
    return; // Prevent the job from running again if it is already running
  }

  try {
    // Set the lock flag to true
    isRunning = true;
    // console.log("Job started...");

    // Simulated job logic
  } catch (error) {
    console.error("Error occurred during job execution:", error);
  } finally {
    // Release the lock flag
    isRunning = false;
    // console.log("Job finished.");
  }
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  console.log(err);
  res.status(err.status || 500).send(err);
});

module.exports = app;
