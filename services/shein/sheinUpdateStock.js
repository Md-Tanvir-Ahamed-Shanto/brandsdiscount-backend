const axios = require('axios');
const crypto = require('crypto');
const { getValidSheinApiCredentials, generateSheinApiSignature, SHEIN_API_CONFIG } = require('./sheinAuthService');

const BASE_API_URL = 'https://open.sheincorp.com'


async function sheinUpdateStock(sku, quantity) {
  try {
    if (!sku) {
      throw new Error("SKU is required for Shein item update.");
    }
    if (typeof quantity !== 'number' || quantity < 0) {
      throw new Error("Quantity must be a non-negative number for Shein item update.");
    }

    const { openKeyId, secretKey } = await getValidSheinApiCredentials();
    const timestamp = Date.now().toString();
    const randomKey = crypto.randomBytes(3).toString('hex');

    const inventoryUpdatePath = `/api/v1/product/update_stock`;

    const updateData = {
      sku_list: [
        {
          sku_code: sku,
          stock: quantity,
        },
      ],
    };

    const headers = {
      "Content-Type": "application/json;charset=UTF-8",
      "x-lt-openKeyId": openKeyId,
      "x-lt-timestamp": timestamp,
      "x-lt-signature": generateSheinApiSignature(openKeyId, secretKey, timestamp, inventoryUpdatePath, randomKey),
      "X-Request-Id": crypto.randomUUID(),
      "x-lt-randomKey": randomKey,
    };

    const url = `${BASE_API_URL}${inventoryUpdatePath}`;
    const response = await axios.post(url, updateData, { headers });

    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Shein Inventory Update Error for SKU ${sku}:`, errorMessage);
    throw error;
  }
}

module.exports = { sheinUpdateStock };