const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { ebayUpdateStock, ebayUpdateStock2, ebayUpdateStock3 } = require("./ebayUpdateStock");
require("dotenv").config();

const consumerKey = process.env.WC_CONSUMER_KEY;
const consumerSecret = process.env.WC_CONSUMER_SECRET;
const storeUrl = process.env.WC_STORE_URL;

const prisma = new PrismaClient();

const wooAPI = axios.create({
  baseURL: `${storeUrl}/wp-json/wc/v3`,
  auth: {
    username: consumerKey,
    password: consumerSecret,
  },
});

async function woocommerceOrderSync(lastSync) {
  let page = 1;
  const perPage = 100;
  const since = lastSync.toISOString();
  const allNewOrUpdated = [];

  try {
    while (true) {
      const res = await wooAPI.get("/orders", {
        params: {
          modified_after: since,
          per_page: perPage,
          page,
          orderby: "modified",
          order: "asc",
        },
      });

      const orders = res.data;
      if (!orders.length) break;
    }

    return allNewOrUpdated;
  } catch (err) {
    console.error(
      "Error syncing Woo orders:",
      err.response?.data || err.message
    );
    throw err;
  }
}

async function updateStockBySku(sku, quantity) {
  try {
    // Step 1: Get the product by SKU
    const { data: products } = await wooAPI.get("/products", {
      params: { sku },
    });

    if (!products || products.length === 0) {
      console.error(`❌ Product with SKU "${sku}" not found`);
      return;
    }

    const product = products[0];

    // Step 2: Update the product stock
    const { data: updatedProduct } = await wooAPI.put(`/products/${product.id}`, {
      manage_stock: true,
      stock_quantity: quantity,
      stock_status: quantity > 0 ? "instock" : "outofstock",
    });

    console.log(`✅ Stock updated for SKU ${sku}: ${quantity}`);
    return updatedProduct;
  } catch (error) {
    console.error("❌ Error updating stock:", error.response?.data || error.message);
  }
}

async function wooComOrderSync() {

  try {
    // 1. Get Woo products modified in last X minutes
    const response = await wooAPI.get("/products", {
      params: {
        page: 1,
        per_page: 100,
        orderby: "modified",
        order: "desc",
      },
    });

    const wooProducts = response.data;

    // 2. Get local product data
    const existingProducts = await prisma.product.findMany({
      select: {
        sku: true,
        stockQuantity: true,
      },
    });

    const existingMap = Object.fromEntries(existingProducts.map(p => [p.sku, p]));

    // 3. Filter Woo products with changed stock
    const stockChangedProducts = wooProducts.filter(product => {
      const local = existingMap[product.sku];
      return local && product.stock_quantity !== local.stockQuantity;
    });

    // 4. Process updates in parallel using Promise.all
    await Promise.all(stockChangedProducts.map(async (product) => {
      const { sku, stock_quantity, name } = product;

      try {
        const [localUpdate, ebay1, ebay2, ebay3] = await Promise.all([
          updateStockBySku(sku, stock_quantity),
          ebayUpdateStock(sku, stock_quantity),
          ebayUpdateStock2(sku, stock_quantity),
          ebayUpdateStock3(sku, stock_quantity),
        ]);

        console.log(`✅ Updated stock for ${name} (SKU: ${sku})`);
      } catch (err) {
        console.error(`❌ Failed to update stock for SKU: ${sku}`, err.message);
      }
    }));

    // 5. Return filtered product data
    return stockChangedProducts.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      manage_stock: product.manage_stock,
      stock_quantity: product.stock_quantity,
      stock_status: product.stock_status,
      date_modified: product.date_modified,
    }));
  } catch (error) {
    console.error("❌ Error fetching updated inventory:", error.message);
    throw error;
  }
}


async function  getAllProduct() {
  try {
    const response = await wooAPI.get("/products", {
      params: {
        per_page: 10,
        page: 1,
      },
    });
    if (!response.data || response.data.length === 0) {
      console.log("No products found.");
      return [];
    }
    return response.data.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      manage_stock: product.manage_stock,
      stock_quantity: product.stock_quantity,
      stock_status: product.stock_status,
      date_modified: product.date_modified,
    }));
  } catch (error) {
    console.error("Error fetching products:", error.response?.data || error.message);
    throw error;
  }
  
}


module.exports = {
  woocommerceOrderSync,
  wooComOrderSync,
  updateStockBySku,
  getAllProduct
};
