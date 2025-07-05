const { ebayOrderSync, ebayOrderSync2, ebayOrderSync3 } = require("../services/ebayOrderSync");
const { wooComOrderSync } = require("../services/wooComService");


const orderSyncController = async (req, res) => {
  try {
    const [ebayOrders, ebayOrders2, ebayOrders3, wooOrders] = await Promise.all([
      ebayOrderSync(),
      ebayOrderSync2(),
      ebayOrderSync3(),
      wooComOrderSync(),
    ]);

    const total = 
      (ebayOrders?.length || 0) + 
      (ebayOrders2?.length || 0) + 
      (ebayOrders3?.length || 0) + 
      (wooOrders?.length || 0);

    res.status(200).json({
      success: true,
      message: `✅ Synced ${total} order(s) successfully.`,
      data: {
        ebayOrders: ebayOrders.length,
        ebayOrders2: ebayOrders2.length,
        ebayOrders3: ebayOrders3.length,
        wooOrders: wooOrders.length,
      },
    });
  } catch (error) {
    console.error("❌ Order sync failed:", error.message);
    res.status(500).json({
      success: false,
      message: "❌ Order sync failed.",
      error: error.message,
    });
  }
};

module.exports = orderSyncController;
