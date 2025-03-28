const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const CryptoJS = require("crypto-js");
const { decryptSheinSecretKey, decrypt } = require("../tools/sheinAuth");

const router = express.Router();

const SHEIN_API_BASE = "https://openapi-test01.sheincorp.cn";
const APP_ID = "10ADAAA5CE0008CF3585A106B6AFF"; // Replace with your Shein APP ID
const APP_SECRET = "D70A14A37467468AA4F5B96CE42A61F2"; // Replace with your Shein APP Secret
const OPENKEYID = "848CA220E27941BB96DC84CE89CDD80D";
const SECRETKEY =
  "xKvqU+9zNB4HzEOguXP7InW5S70r6IxoyACe7rlGyQIG/cATT2VTyUFybl7dKCpw";
const REDIRECT_URI =
  "https://e2f0-103-148-179-215.ngrok-free.app/shein/auth/callback"; // This must match the one in Shein's developer console

/**
 * Generate x-lt-signature required for API requests
 * @param {string} data - Data to sign (use APP_ID for auth API)
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
 * Callback Route: Handle Shein OAuth response
 */
router.get("/auth/callback", async (req, res) => {
  try {
    const { tempToken } = req.query;
    const timestamp = Date.now();
    const randomKey = "test1";

    if (!tempToken) {
      return res.status(400).json({ error: "Missing tempToken" });
    }

    console.log("Received tempToken:", tempToken);

    // Generate signature
    const signature = generateSignature(
      APP_ID,
      APP_SECRET,
      "/open-api/auth/get-by-token",
      timestamp,
      randomKey
    );

    // Exchange tempToken for openKeyId and encrypted secretKey
    const response = await axios.post(
      `${SHEIN_API_BASE}/open-api/auth/get-by-token`,
      { tempToken },
      {
        headers: {
          "Content-Type": "application/json",
          "x-lt-appid": APP_ID,
          "x-lt-signature": signature,
          "x-lt-timestamp": timestamp,
        },
      }
    );

    // if (response.data.code !== 200) {
    //   console.log(response);
    //   console.log(response.data);
    //   throw new Error(`Shein API Error: ${response.data.message}`);
    // }

    const { openKeyId, secretKey: encryptedSecretKey } = response.data.data;

    console.log("Open Key ID:", openKeyId);
    console.log("Encrypted Secret Key:", encryptedSecretKey);

    // Redirect or return response
    return res.json({
      message: "Authorization successful",
      openKeyId,
      encryptedSecretKey,
    });
  } catch (error) {
    console.log(error);
    console.error("Shein OAuth Callback Error:", error.message);
    return res.status(500).json({ error: "Failed to process Shein OAuth" });
  }
});

router.post("/createProduct", async (req, res) => {
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
  const secretKey = decrypt(SECRETKEY, APP_SECRET);
  console.log("secretKey");
  console.log(secretKey);
  const randomKey = "test1";
  let timestamp = Date.now();
  const signature = generateSignature(
    OPENKEYID,
    secretKey,
    "/open-api/goods/product/publishOrEdit",
    timestamp,
    randomKey
  );
  console.log("sigggg", signature);

  // Exchange tempToken for openKeyId and encrypted secretKey
  try {
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
    console.log(response);
    console.log(response.data);
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
