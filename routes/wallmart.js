const express = require("express");
const fs = require("fs").promises; // Use promises version
const path = require("path");
const { listWalmartProduct } = require("../tools/wallmartAuth");

const router = express.Router();

// Route to trigger product listing
router.post("/create-product", async (req, res) => {
  try {
    const data = await listWalmartProduct();
    res.json(data);
  } catch (error) {
    console.error("❌ Route error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
