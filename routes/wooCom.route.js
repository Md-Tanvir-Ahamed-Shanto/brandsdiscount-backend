const express = require("express");
const { woocommerceOrderSync, updateStockBySku, getAllProduct, wooComOrderSync } = require("../services/wooComService");
const { getRecentOrders } = require("../tools/wooCommerce");

const wooComRoutes = express.Router();

wooComRoutes.get("/sync", async (req, res) => {
  try {
    const lastSync = new Date(Date.now() - 60 * 60 * 1000); // Sync orders modified in the last 10 minutes
    const syncedOrders = await woocommerceOrderSync(lastSync);
    res
      .status(200)
      .json({ message: "Sync successful", count: syncedOrders.length });
    res.status(200).json({
      message: "WooCommerce orders synced successfully",
      // orders: orders || [],
    });
  } catch (error) {
    if (!res.headersSent) {
      return res
        .status(500)
        .json({
          message: "Failed to sync WooCommerce orders",
          error: error.message,
        });
    }
  }
});

wooComRoutes.get("/product", async (req, res) => {
  try {
    const products = await wooComOrderSync();
    res.status(200).json({
      message: "WooCommerce orders fetched successfully",
      products: products || [],
    });
  } catch (error) {
    if (!res.headersSent) {
      return res
        .status(500)
        .json({
          message: "Failed to fetch WooCommerce orders",
          error: error.message,
        });
    }
  }
});

wooComRoutes.get('/products',async (req,res)=>{
    try {
        const products = await getAllProduct();
        res.status(200).json({
        message: "WooCommerce products fetched successfully",
        products: products || [],
        });
    } catch (error) {
        if (!res.headersSent) {
        return res
            .status(500)
            .json({
            message: "Failed to fetch WooCommerce products",
            error: error.message,
            });
        }
    }
})

wooComRoutes.get('/update-stock', async (req, res) => {
  const sku = "ST1-013772-1",
    quantity = "2";

  if (!sku || !quantity) {
    return res.status(400).json({ message: "SKU and quantity are required" });
  }

  try {
    const updatedProduct = await updateStockBySku(sku, parseInt(quantity));
    res.status(200).json({
      message: `Stock for SKU ${sku} updated successfully`,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({
      message: "Failed to update stock",
      error: error.message,
    });
  }
});

module.exports = wooComRoutes;
