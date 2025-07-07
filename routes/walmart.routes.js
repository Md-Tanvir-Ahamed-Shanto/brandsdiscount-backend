const express = require("express");
const { walmartOrderSync, listWalmartProduct } = require("../services/walmartService");

const walmartRoutes = express.Router();

walmartRoutes.get("/sync", async (req,res)=>{
    try {
        console.log("Syncing Walmart orders...");
        const response = await walmartOrderSync();
        // console.log("Walmart orders synced successfully:", response);
        return res.status(200).json({data: response.data});
    } catch (error) {
        console.log("error", error)
        return res.status(500).json({error: "Failed to sync Walmart orders"});
    }
})

module.exports = walmartRoutes;