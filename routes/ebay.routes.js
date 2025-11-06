const express = require("express");

const ebayRoutes = express.Router();

const {
  ebayOrderSync,
  ebayOrderSync2,
  ebayOrderSync3,
  getEbayThreeLatestOrders,
  getEbayTwoLatestOrders,
  getEbayOneLatestOrders,
  ManualEbayOrderSync,
  ManualEbayOrderSync3,
  ManualEbayOrderSync2,
} = require("../services/ebayOrderSync");
const {
  getAccessToken,
  getValidAccessToken,
  refreshAccessToken,
} = require("../tools/ebayAuth");
const { createEbayProduct } = require("../services/ebayCreateProduct");
const { ebayUpdateStock, manulayUpdateEbayStock } = require("../services/ebayUpdateStock");
const { updateEbayProduct } = require("../services/ebayUpdateProduct");
const {updateEbayStockBySku} = require("../services/ebayTradingAPI");

// Sync eBay orders
ebayRoutes.get("/sync", async (req, res) => {
  try {
    const ebayOrders = await ebayOrderSync();
    const ebayOrders2 = await ebayOrderSync2();
    const ebayOrders3 = await ebayOrderSync3();

    res.status(200).json({
      message: "eBay orders synced successfully",
      ebayOrders,
      ebayOrders2,
      ebayOrders3
    });
  } catch (error) {
    console.error("Error syncing eBay orders:", error);
    res.status(500).json({ error: "Failed to sync eBay orders" });
  }
});


ebayRoutes.get("/order-ebay1", async (req, res) => {
  try {
    // Get days from query parameter, default to 1 if not provided
    const days = req.query.days || 1;
    console.log(`Fetching eBay1 orders for the last ${days} day(s)`);
    
    const ebayOrders = await getEbayOneLatestOrders(days);
    res.status(200).json({
      message: `eBay1 orders for the last ${days} day(s) retrieved successfully`,
      ebayOrders,
    });
  } catch (error) {
    console.error("Error syncing eBay orders:", error);
    res.status(500).json({ error: "Failed to get eBay1 orders" });
  }
});



ebayRoutes.get("/order-ebay2", async (req, res) => {
  try {
    // Get days from query parameter, default to 1 if not provided
    const days = req.query.days || 1;
    console.log(`Fetching eBay2 orders for the last ${days} day(s)`);
    
    const ebayOrders2 = await getEbayTwoLatestOrders(days);
    res.status(200).json({
      message: `eBay2 orders for the last ${days} day(s) retrieved successfully`,
      ebayOrders2,
    });
  } catch (error) {
    console.error("Error syncing eBay orders:", error);
    res.status(500).json({ error: "Failed to get eBay2 orders" });
  }
});

ebayRoutes.get("/order-ebay3", async (req, res) => {
  try {
    // Get days from query parameter, default to 1 if not provided
    const days = req.query.days || 1;
    console.log(`Fetching eBay3 orders for the last ${days} day(s)`);
    
    const ebayOrders3 = await getEbayThreeLatestOrders(days);
    res.status(200).json({
      message: `eBay3 orders for the last ${days} day(s) retrieved successfully`,
      ebayOrders3,
    });
  } catch (error) {
    console.error("Error syncing eBay orders:", error);
    res.status(500).json({ error: "Failed to get eBay3 orders" });
  }
});

ebayRoutes.get("/sync-ebay1", async (req, res) => {
  try {
    // Get days from query parameter, default to 1 if not provided
    const days = req.query.days || 1;
    console.log(`Syncing eBay1 orders for the last ${days} day(s)`);
    
    const ebayOrders = await ManualEbayOrderSync(days);
    res.status(200).json({
      message: `eBay1 orders for the last ${days} day(s) synced successfully`,
      ebayOrders,
    });
  } catch (error) {
    console.error("Error syncing eBay orders:", error);
    res.status(500).json({ error: "Failed to sync eBay1 orders" });
  }
});

ebayRoutes.get("/sync-ebay2", async (req, res) => {
  try {
    // Get days from query parameter, default to 1 if not provided
    const days = req.query.days || 1;
    console.log(`Syncing eBay2 orders for the last ${days} day(s)`);
    
    const ebayOrders2 = await ManualEbayOrderSync2(days);
    res.status(200).json({
      message: `eBay2 orders for the last ${days} day(s) synced successfully`,
      ebayOrders2,
    });
  } catch (error) {
    console.error("Error syncing eBay orders:", error);
    res.status(500).json({ error: "Failed to sync eBay2 orders" });
  }
});

ebayRoutes.get("/sync-ebay3", async (req, res) => {
  try {
    // Get days from query parameter, default to 1 if not provided
    const days = req.query.days || 1;
    console.log(`Syncing eBay3 orders for the last ${days} day(s)`);
    
    const ebayOrders3 = await ManualEbayOrderSync3(days);
    res.status(200).json({
      message: `eBay3 orders for the last ${days} day(s) synced successfully`,
      ebayOrders3,
    });
  } catch (error) {
    console.error("Error syncing eBay orders:", error);
    res.status(500).json({ error: "Failed to sync eBay3 orders" });
  }
});


ebayRoutes.get("/update-stock", async (req, res) => {
  const { sku, stockQuantity, ebayAccount } = req.query;
  if (!sku) {
    return res
      .status(400)
      .json({ error: "SKU is required" });
  }

  try {
    const response = await updateEbayStockBySku(sku, stockQuantity, ebayAccount);
    res
      .status(200)
      .json({ message: "Stock updated successfully", response });
  } catch (error) {
    console.error("Error updating eBay stock:", error);
    res.status(500).json({ error: "Failed to update eBay stock" });
  }
});



ebayRoutes.get("/token", async (req, res) => {
  try {
    const accessToken = await refreshAccessToken();
    res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Error getting eBay access token:", error);
    res.status(500).json({ error: "Failed to get eBay access token" });
  }
});

ebayRoutes.get("/at", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken();
    res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Error getting eBay access token:", error);
    res.status(500).json({ error: "Failed to get eBay access token" });
  }
});

ebayRoutes.get("/c", async (req, res) => {
  //demo product create
  const product = {
    title: "Sample Product with 2 images",
    brandName: "Sample Brand",
    images: [
      "https://www.houseofblanks.com/cdn/shop/files/HeavyweightTshirt_White_02_1.jpg?v=1726516823&width=1445","https://originalfavorites.com/cdn/shop/files/White_T-Shirt_Detail_On_Model_Shopify_Final.jpg?v=1732569627&width=3000",
    ],
    sku: `SKU-DEMO6-${Date.now()}`,
    regularPrice: 1200,
    stockQuantity: 7,
    description: "This is a samples product description.",
    categoryId: "53159",
  };
  try {
    const response = await createEbayProduct(product);
    res.status(200).json({ message: "Product created successfully", response });
  } catch (error) {
    if (error.response && error.response.data && error.response.data.errors) {
      console.error("eBay API Errors:", error.response.data.errors);
    } else {
      console.error(error);
    }
    res.status(500).json({ error: "Failed to create eBay product" });
  }
});

ebayRoutes.get("/q", async (req, res) => {
  const sku = "SKU-DEMO5-1751344768022";
  const stockQuantity = 100;
  if (!sku || !stockQuantity) {
    return res
      .status(400)
      .json({ error: "SKU and stock quantity are required" });
  }

  try {
    const response = await ebayUpdateStock(sku, stockQuantity);
    res
      .status(200)
      .json({ message: "Stock quantity updated successfully", response });
  } catch (error) {
    console.error("Error updating stock quantity:", error);
    res.status(500).json({ error: "Failed to update stock quantity" });
  }
});

ebayRoutes.get("/u", async (req, res) => {
  // update eBay product
  const sku = "SKU-DEMO5-1751344768022";
  const product = {
    title: "new update Product 33",
    brandName: "update Brand 3",
    images: [
      "https://www.houseofblanks.com/cdn/shop/files/HeavyweightTshirt_White_02_1.jpg?v=1726516823&width=1445",
    ],
    description: "This is a samples product description.",
    images: [
      "https://www.houseofblanks.com/cdn/shop/files/HeavyweightTshirt_White_02_1.jpg?v=1726516823&width=1445",
    ],
    regularPrice: 1200.99,
    stockQuantity: 150,
    description: "This is an updated product description.",
    categoryId: "53159",
    size: "M",
    sizeType: "Regular",
    type: "T-Shirt",
    department: "Men's Clothing",
    color: "Red",
  };

  try {
    const response = await updateEbayProduct(sku, product);
    res.status(200).json({ message: "Product updated successfully", response });
  } catch (error) {
    console.error("Error updating eBay product:", error);
    res.status(500).json({ error: "Failed to update eBay product" });
  }
});

// Export the eBay routes
module.exports = ebayRoutes;
