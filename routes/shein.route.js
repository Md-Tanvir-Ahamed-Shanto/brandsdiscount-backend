const express = require("express");
const sheinOrderSync = require("../services/shein/sheinOrderSync");
const { getValidSheinApiCredentials, exchangeSheinTempToken } = require("../services/shein/sheinAuthService");

const sheinRoutes = express.Router();

sheinRoutes.get("/sync", async (req,res)=>{
    try {
        const response = await sheinOrderSync();
        res.status(200).json({
            data: response.data
        })
    } catch (error) {
        console.log("Error", error)
        res.status(500).json({message: "Sync Feild"})
    }
})

sheinRoutes.get("/token", async (req,res)=>{
     try {
        const response = await exchangeSheinTempToken();
        res.status(200).json({
            data: response.data
        })
    } catch (error) {
        console.log("Error", error)
        res.status(500).json({message: "Sync Feild"})
    }
})

module.exports = sheinRoutes;