const axios = require("axios");
const { getValidAccessToken } = require("../tools/ebayAuth");

async function createEbayLocation() {
  try {
    const token = await getValidAccessToken();
    const key = "warehouse1"; // unique within 36 chars

    const payload = {
      location: {
        address: {
          postalCode: "95125",
          country: "US"
        }
      },
      name: "Main Warehouse",
      merchantLocationStatus: "ENABLED",
      locationTypes: ["WAREHOUSE"]
    };

    await axios.post(
      `https://api.ebay.com/sell/inventory/v1/location/${key}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("✅ Created location:", key);
  } catch (err) {
    console.error("❌ Error creating location:", err.response?.data || err.message);
  }
}

createEbayLocation();
