const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const { getValidAccessToken } = require("./ebayAuth3");
const prisma = new PrismaClient();

async function ebayUpdateInventory3(sku, quantity) {
  const token = await getValidAccessToken();

  try {
    const offerId = await axios.get(
      `https://api.ebay.com/sell/inventory/v1/offer?sku=${sku}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const reqBody = {
      requests: [
        {
          offers: [
            {
              availableQuantity: quantity,
              offerId: offerId,
            },
          ],
          shipToLocationAvailability: {
            availabilityDistributions: [
              {
                fulfillmentTime: {
                  unit: "DAY",
                  value: 3,
                },
                merchantLocationKey: "mk1",
                quantity: quantity,
              },
            ],
            quantity: quantity,
          },
          sku: sku,
        },
      ],
    };

    const newInventory = await axios.put(
      "https://api.ebay.com/sell/inventory/v1/bulk_update_price_quantity",
      reqBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
  } catch (error) {
    console.log("ebay item update error", error);
  }
}

module.exports = {
  ebayUpdateInventory3,
};
