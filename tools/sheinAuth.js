const crypto = require("crypto");
const axios = require("axios");
const CryptoJS = require("crypto-js");

const SHEIN_API_BASE = "https://open-api.shein.com";
const APP_ID = "YOUR_APP_ID"; // Replace with your Shein APP ID
const APP_SECRET = "YOUR_APP_SECRET"; // Replace with your Shein APP Secret
const REDIRECT_URI = "YOUR_REDIRECT_URI"; // The callback URL registered in Shein

/**
 * Generate the authorization link for the client
 */
function generateAuthLink() {
  return `${SHEIN_API_BASE}/open-api/auth/oauth/authorize?appId=${APP_ID}&redirectUri=${encodeURIComponent(
    REDIRECT_URI
  )}`;
}

/**
 * Generate x-lt-signature required for API requests
 */
function generateSignature(openKeyId, secretKey, path, timestamp, randomKey) {
  // Step 1: Assemble signature data VALUE
  var value = openKeyId + "&" + timestamp + "&" + path;
  console.log("Step 1 - Signature data VALUE: " + value);

  // Step 2: Assemble signature key KEY
  var key = secretKey + randomKey;
  console.log("Step 2 - Signature key KEY: " + key);

  // Step 3: HMAC-SHA256 calculation and conversion to hexadecimal
  var hexSignature = CryptoJS.HmacSHA256(value, key).toString();
  console.log("Step 3 - HMAC-SHA256 result (HEX): " + hexSignature);

  // Step 4: Base64 encoding
  var base64Signature = CryptoJS.enc.Base64.stringify(
    CryptoJS.enc.Utf8.parse(hexSignature)
  );
  console.log("Step 4 - Base64 encoding result: " + base64Signature);

  // Step 5: Append RandomKey
  var finalSignature = randomKey + base64Signature;
  console.log("Step 5 - Final signature: " + finalSignature);

  return finalSignature;
}

/**
 * Exchange tempToken for openKeyId and encrypted secretKey
 * @param {string} tempToken - The tempToken received from Shein after user authorization
 */
async function exchangeTempTokenForKeys(tempToken) {
  try {
    const signature = generateSignature(APP_ID);

    const response = await axios.post(
      `${SHEIN_API_BASE}/open-api/auth/get-by-token`,
      { temptoken: tempToken },
      {
        headers: {
          "Content-Type": "application/json",
          "x-lt-appid": APP_ID,
          "x-lt-signature": signature,
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(`Error from Shein API: ${response.data.message}`);
    }

    const { openKeyId, secretKey } = response.data.data;
    return { openKeyId, encryptedSecretKey: secretKey };
  } catch (error) {
    console.error("Error exchanging temp token:", error.message);
    throw error;
  }
}

/**
 * Decrypt the secretKey
 * @param {string} encryptedSecretKey - The encrypted secretKey from Shein API
 */
function decryptSheinSecretKey(encryptedSecretKey, appSecret) {
  const key = CryptoJS.enc.Utf8.parse(appSecret); // Convert APP_SECRET to CryptoJS format
  const decrypted = CryptoJS.AES.decrypt(encryptedSecretKey, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

function encrypt(
  content,
  key = "space-station-default-key",
  ivSeed = "space-station-default-iv"
) {
  if (!content || !key) {
    throw new Error("Content and key cannot be empty");
  }

  try {
    const keyBytes = getKeyBytes(key);
    const ivBytes = getIVBytes(ivSeed);

    const cipher = crypto.createCipheriv("aes-128-cbc", keyBytes, ivBytes);
    let encrypted = cipher.update(content, "utf8", "base64");
    encrypted += cipher.final("base64");

    return encrypted;
  } catch (error) {
    console.error("AES encryption failed:", error);
    return null;
  }
}

// AES Decryption function
function decrypt(content, key, ivSeed = "space-station-default-iv") {
  if (!content || !key) {
    throw new Error("Ciphertext and key cannot be empty");
  }

  try {
    const keyBytes = getKeyBytes(key);
    const ivBytes = getIVBytes(ivSeed);

    const decipher = crypto.createDecipheriv("aes-128-cbc", keyBytes, ivBytes);
    let decrypted = decipher.update(content, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("AES decryption failed:", error);
    return null;
  }
}

// Helper function to generate key byte array (Ensuring correct size)
function getKeyBytes(key) {
  const keyBytes = Buffer.from(key, "utf8");
  return keyBytes.subarray(0, 16); // Use subarray instead of slice
}

// Helper function to generate IV byte array
function getIVBytes(ivSeed) {
  const ivBytes = Buffer.from(ivSeed, "utf8");
  return ivBytes.subarray(0, 16); // Use subarray instead of slice
}

// Example Usage:
async function main() {
  // Step 1: Generate Auth Link (Send this to client)
  const authLink = generateAuthLink();
  console.log("Authorize the app using this link:", authLink);

  // Step 2: Assume we receive the tempToken from Shein after user authorization
  const tempToken = "YOUR_TEMP_TOKEN"; // This will be received in your redirect URI

  // Step 3: Exchange tempToken for OpenKeyId and encrypted SecretKey
  const { openKeyId, encryptedSecretKey } = await exchangeTempTokenForKeys(
    tempToken
  );

  // Step 4: Decrypt secretKey
  //   const secretKey = decryptSheinSecretKey(encryptedSecretKey);

  console.log("Open Key ID:", openKeyId);
  console.log("Decrypted Secret Key:", secretKey);
}

async function publishOrEditProductToShein(
  OPENKEYID,
  SECRETKEY,
  APP_SECRET,
  SHEIN_API_BASE
) {
  const payload = {
    brand_code: "",
    category_id: 13132,
    product_type_id: 9867,
    multi_language_desc_list: [
      {
        language: "en",
        name: "&lt;p&gt;cd test description \n sc_eu20241127001&lt;/p&gt;",
      },
    ],
    multi_language_name_list: [
      {
        language: "en",
        name: "test name sc_eu20241127001",
      },
    ],
    part_info_list: null,
    product_attribute_list: [
      {
        attribute_id: 1001236,
        attribute_type: 4,
        attribute_value_id: 546,
      },
      {
        attribute_id: 160,
        attribute_type: 4,
        attribute_value_id: 62,
      },
      {
        attribute_id: 1000627,
        attribute_type: 4,
        attribute_value_id: 70,
      },
      {
        attribute_id: 1000411,
        attribute_type: 4,
        attribute_value_id: 1002333,
        attribute_extra_value: "100",
      },
      {
        attribute_id: 1000407,
        attribute_type: 4,
        attribute_value_id: 1005244,
      },
      {
        attribute_id: 1000462,
        attribute_type: 4,
        attribute_value_id: 1004808,
      },
      {
        attribute_extra_value: "",
        attribute_id: 152,
        attribute_type: 3,
        attribute_value_id: 1110,
      },
      {
        attribute_id: 1001518,
        attribute_type: 4,
        attribute_value_id: 12808900,
      },
    ],
    skc_list: [
      {
        image_info: {
          image_info_list: [
            {
              image_sort: 1,
              image_type: 1,
              image_url:
                "https://imgdeal-test01.shein.com/images3_pi/2024/12/10/27/17338148602250996226.jpeg",
            },
            {
              image_sort: 2,
              image_type: 2,
              image_url:
                "https://imgdeal-test01.shein.com/images3_pi/2024/12/10/27/17338148602250996226.jpeg",
            },
            {
              image_sort: 3,
              image_type: 5,
              image_url:
                "https://imgdeal-test01.shein.com/images3_pi/2024/12/10/59/17338148663526671606.jpeg",
            },
          ],
        },
        sale_attribute: {
          attribute_id: 27,
          attribute_value_id: 81,
        },
        skc_title: null,
        sku_list: [
          {
            height: "5.00",
            length: "10.00",
            width: "10.00",
            weight: "10",
            mall_state: 1,
            sale_attribute_list: [],
            sku_code: "",
            price_info_list: [
              {
                base_price: 10.0,
                currency: "EUR",
                sub_site: "shein-fr",
              },
            ],
            stock_info_list: [
              {
                inventory_num: 10,
              },
            ],
            stop_purchase: 1,
            supplier_sku: "sc_eu20241127001ss241113986146541TEST2",
            competing_product_link: "",
            image_info: null,
          },
        ],
        supplier_code: "",
        shelf_require: "0",
        shelf_way: "1",
        hope_on_sale_date: null,
      },
    ],
    sale_attribute_sort_list: [],
    source_system: "openapi",
    spu_code: null,
    spu_name: "",
    suit_flag: 0,
    supplier_code: "sc20241119002s2412100969",
    image_info: null,
    is_spu_pic: false,
    sample_info: null,
  };

  try {
    const secretKey = decrypt(SECRETKEY, APP_SECRET);
    const randomKey = "test1";
    const timestamp = Date.now();

    const signature = generateSignature(
      OPENKEYID,
      secretKey,
      "/open-api/goods/product/publishOrEdit",
      timestamp,
      randomKey
    );

    const response = await axios.post(
      `${SHEIN_API_BASE}/open-api/goods/product/publishOrEdit`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-lt-openKeyId": OPENKEYID,
          "x-lt-signature": signature,
          "x-lt-timestamp": timestamp,
          language: "en",
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error("SHEIN API Error:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// Uncomment to run
// main();
module.exports = {
  generateAuthLink,
  exchangeTempTokenForKeys,
  decryptSheinSecretKey,
  decrypt,
  publishOrEditProductToShein,
};
