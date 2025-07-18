const axios = require('axios');
const crypto = require('crypto');
const prisma = require('../../db/connection');
const { generateSheinApiSignature, getValidSheinApiCredentials } = require('./sheinAuthService');
const { sheinUpdateStock } = require('./sheinUpdateStock');
const { ebayUpdateStock2, ebayUpdateStock3 } = require('../ebayUpdateStock');
const { updateStockBySku } = require('../wooComService');
const { walmartItemUpdate } = require('../walmartService');

const BASE_API_URL = 'https://open.sheincorp.com'

async function sheinOrderSync() {
  try {
    const { openKeyId, secretKey } = await getValidSheinApiCredentials();

    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const formatSheinDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const createdTimeStart = formatSheinDate(thirtyMinAgo);
    const createdTimeEnd = formatSheinDate(now);

    const queryParams = {
      created_time_start: createdTimeStart,
      created_time_end: createdTimeEnd,
      order_status: 1,
      page_num: 1,
      page_size: 50,
    };

    const orderListPath = `/api/order/v1/queryOrderList`;
    const timestamp = Date.now().toString();
    const randomKey = crypto.randomBytes(3).toString('hex'); // For Shein signature

    const headers = {
      "Content-Type": "application/json;charset=UTF-8",
      "x-lt-openKeyId": openKeyId,
      "x-lt-timestamp": timestamp,
      "x-lt-signature": generateSheinApiSignature(openKeyId, secretKey, timestamp, orderListPath, queryParams, null, randomKey),
      "X-Request-Id": crypto.randomUUID(),
      "x-lt-randomKey": randomKey
    };

    const queryString = new URLSearchParams(queryParams).toString();
    const url = `${BASE_API_URL}${orderListPath}?${queryString}`;

    const response = await axios.get(url, { headers });

    const sheinOrders = response.data?.info?.data?.orderList || [];

    if (!sheinOrders.length) {
      return [];
    }

    const existingOrders = await prisma.sheinOrder.findMany({
      select: { orderId: true },
    });
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = sheinOrders.filter(
      (order) => !existingOrderIds.has(order.orderNo)
    );

    if (!newOrders.length) {
      return [];
    }

    const ordersToCreate = newOrders.map((order) => ({
      orderId: order.orderNo,
      orderCreationDate: new Date(order.orderDate || order.create_time),
      status: order.orderStatus,
    }));

    await prisma.sheinOrder.createMany({
      data: ordersToCreate,
      skipDuplicates: true,
    });

    for (const order of newOrders) {
      const lineItems = order.orderGoodsInfoList || [];

      for (const item of lineItems) {
        const sku = item.sellerSku;
        const qty = item.goodsQuantity;

        if (!sku || qty == null) {
          continue;
        }

        const product = await prisma.product.findUnique({
          where: { sku },
        });

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0);

          await prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          });

          // await Promise.allSettled([
          //   sheinUpdateStock(sku, newStock),
          //   ebayUpdateStock2(sku, newStock),
          //   ebayUpdateStock3(sku, newStock),
          //   updateStockBySku(sku, newStock),
          //   walmartItemUpdate(sku, newStock),
          // ]).then(results => {
          //   results.forEach((result, index) => {
          //     if (result.status === 'rejected') {
          //       const platformMap = {
          //         0: 'Shein',
          //         1: 'eBay (Account 2)',
          //         2: 'eBay (Account 3)',
          //         3: 'WooCommerce',
          //         4: 'Walmart'
          //       };
          //       const platformName = platformMap[index] || 'Unknown Platform';
          //       console.warn(`${platformName} inventory update failed for SKU ${sku}:`, result.reason?.message || result.reason);
          //     }
          //   });
          // });
        }
      }
    }
    return newOrders;
  } catch (error) {
    console.error(
      "❌ Error syncing Shein orders:",
      error.response?.data || error.message || error
    );
    throw new Error("Shein order sync failed.");
  }
}

module.exports = sheinOrderSync;