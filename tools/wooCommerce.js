// lib/woocommerce.js
const axios = require("axios");
const { ebayInventorySync } = require("./ebayAuth");
const { ebayInventorySync2 } = require("./ebayAuth2");
const { walmartItemUpdate } = require("./wallmartInventory");
const { ebayUpdateInventory3 } = require("./ebayInventory3");

const consumerKey = process.env.WC_CONSUMER_KEY;
const consumerSecret = process.env.WC_CONSUMER_SECRET;
const storeUrl = process.env.WC_STORE_URL;

const wooAPI = axios.create({
  baseURL: `${storeUrl}/wp-json/wc/v3`,
  auth: {
    username: consumerKey,
    password: consumerSecret,
  },
});

async function createProduct(productData) {
  const response = await wooAPI.post("/products", {
    name: productData.title,
    sku: productData.sku,
    regular_price: productData.regular_price,
    description: productData.description || "",
    images: productData.images || [],
    date_created_gmt: new Date().toISOString(),
    categories: productData.categories || [],
    stock_quantity: productData.stock_quantity,
  });

  return response.data;
}

// async function woocommerceItemUpdate(sku, updateData) {
//   const product = await wooAPI.get("/products", {
//     params: { sku },
//   });
//   const response = await wooAPI.put(
//     `/products/${product.data[0].id}`,
//     updateData
//   );
//   return response.data;
// }

async function getRecentOrders() {
  const response = await wooAPI.get("/orders", {
    params: {
      page: 1,
      per_page: 10,
      orderby: "date",
      order: "desc",
    },
  });

  return response.data;
}

// Check inventory instead of orders
async function woocommerceOrderSync() {
  try {
    const now = new Date(Date.now() - 60 * 60 * 1000).toISOString(); 

    const response = await wooAPI.get("/orders", {
      params: {
        after: now,
        per_page: 100,
        orderby: "date",
        order: "desc",
      },
    });

    const data = response.data;
 
    const existingOrders = await prisma.woocommmerceOrder.findMany();
    console.log("exisitng orders", existingOrders);
    const newOrders = data.orders.filter(
      (order) =>
        !existingOrders.find((existing) => existing.orderId === order.id)
    );

    console.log(`new ordersssss`, newOrders);

    const clearDB = await prisma.woocommmerceOrder.deleteMany({});
    const createOrders = await prisma.woocommmerceOrder.createMany({
      data: newOrders.map((order) => ({
        orderId: order.id,
        orderCreationDate: new Date(order.date_created_gmt),
      })),
    });
    console.log(`new ordersssss222222`, newOrders);

    newOrders.forEach(async (order) => {
      order.line_items.forEach(async (item) => {
        console.log("syncing order:", order);
        const productData = await prisma.product.findUnique({
          where: {
            sku: item.sku,
          },
        });
        if (productData) {
          ebayInventorySync(
            item.sku,
            productData.stockQuantity - item.quantity
          );
          ebayInventorySync2(
            item.sku,
            productData.stockQuantity - item.quantity
          );
          ebayUpdateInventory3(
            item.sku,
            productData.stockQuantity - item.quantity
          );
          walmartItemUpdate(
            item.sku,
            productData.stockQuantity - item.quantity
          );
          const updateProduct = await prisma.product.update({
            where: {
              sku: item.sku,
            },
            data: {
              stockQuantity: productData.stockQuantity - item.quantity,
            },
          });
        }
      });
    });
    return newOrders;
  } catch (error) {
    console.error(
      "Error fetching Walmart orders:",
      error.response?.data || error.message
    );
    console.log(error);
  }
}

async function getFirstFiftyProducts() {
  const response = await wooAPI.get("/products", {
    params: {
      per_page: 50,
      page: 1,
    },
  });

  return response.data;
}

module.exports = {
  wooAPI,
  getRecentOrders,
  createProduct,
  woocommerceOrderSync,
  getFirstFiftyProducts,
};
