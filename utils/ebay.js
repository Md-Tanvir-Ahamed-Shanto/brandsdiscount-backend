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

// createEbayLocation();


async function listEbayLocations() {
  const accessToken = await getValidAccessToken();
  try {
    const response = await axios.get('https://api.ebay.com/sell/inventory/v1/location', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    const locations = response.data.locations;
    console.log('Your eBay Inventory Locations:');
    locations.forEach(location => {
      console.log(`- ${location.name} (${location.merchantLocationKey})`);
    });
  } catch (error) {
    console.error('Error fetching locations:', error.response?.data || error.message);
  }
}

listEbayLocations();


