const express = require("express");
const { walmartOrderSync, listWalmartProduct, ManualWalmartOrderSync2, ManualWalmartOrderSync } = require("../services/walmartService");

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

walmartRoutes.get("/sync-wallmart1", async (req,res)=>{
    try {
        console.log("Syncing Walmart orders...");
        const response = await ManualWalmartOrderSync();
        return res.status(200).json({data: response.data});
    } catch (error) {
        console.log("error", error)
        return res.status(500).json({error: "Failed to sync Walmart orders"});
    }
})

walmartRoutes.get("/sync-wallmart2", async (req,res)=>{
    try {
        console.log("Syncing Walmart2 orders...");
        const response = await ManualWalmartOrderSync2();
        return res.status(200).json({data: response.data});
    } catch (error) {
        console.log("error", error)
        return res.status(500).json({error: "Failed to sync Walmart2 orders"});
    }
})

module.exports = walmartRoutes;