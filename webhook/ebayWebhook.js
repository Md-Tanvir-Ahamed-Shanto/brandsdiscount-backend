const express = require("express");
const router = express.Router();

const { createHash } = require("crypto");
const { getValidAccessToken } = require("../tools/ebayAuth");
const xml2js = require("xml2js");

router.post("/ebay", (req, res) => {
  console.log("ebay post webhook");
  const { notificationPayload } = req.body;

  // TODO: Verify the webhook payload (important!)

  console.log("Received notification:", notificationPayload);

  // Handle different notification types
  switch (notificationPayload.topic) {
    case "ITEM_SOLD":
      // Do something cool when an item is sold
      break;
    case "ITEM_CREATED":
      // Maybe update your local inventory?
      break;
    // Add more cases as needed
  }

  res.sendStatus(200);
});

// The GET route for receiving the challenge from eBay
router.get("/ebay", async (req, res) => {
  const verificationToken =
    "a1b2c3d4e5f6g7h8i9j0_k1l2m3n4o5p6q7r8s9t0-u1v2w3x4y5z6";
  const endpoint = "https://66ac-103-148-179-215.ngrok-free.app/webhook/ebay";
  console.log("ebay webhook started");
  // const verificationToken = await getValidAccessToken();
  const { challenge_code } = req.query; // Get the challenge code from query
  console.log(challenge_code);
  console.log(verificationToken);
  console.log(endpoint);

  if (!challenge_code) {
    return res.status(400).json({ error: "challenge_code is required" });
  }

  // Hash the values in the specified order: challengeCode + verificationToken + endpoint
  const hash = createHash("sha256");
  hash.update(challenge_code); // challenge code from eBay
  hash.update(verificationToken); // Your verification token
  hash.update(endpoint); // Your endpoint URL

  const responseHash = hash.digest("hex"); // Compute the hash

  // Send the challenge response back to eBay in the required format
  res.status(200).json({ challengeResponse: responseHash });
});

// Endpoint to receive eBay push notifications (SOAP messages)
router.post("/ebay/notifications", (req, res) => {
  const xmlPayload = req.body;
  console.log("Received SOAP notification from eBay:\n", xmlPayload);

  // Parse the XML payload
  xml2js.parseString(xmlPayload, { explicitArray: false }, (err, result) => {
    if (err) {
      console.error("Error parsing XML:", err);
      return res.sendStatus(500);
    }

    // Typically, the SOAP envelope will wrap the actual notification
    // The structure can vary; inspect the result to extract details
    const soapBody =
      result["soapenv:Envelope"]?.["soapenv:Body"] ||
      result["Envelope"]?.["Body"];
    if (soapBody) {
      console.log(
        "Parsed Notification Body:\n",
        JSON.stringify(soapBody, null, 2)
      );
      // Process the notification based on the event type and payload...
    } else {
      console.warn("SOAP Body not found in the notification payload.");
    }

    // Respond with 200 OK to acknowledge receipt
    res.sendStatus(200);
  });
});

module.exports = router;
