const express = require("express");
const orderSyncController = require("../controllers/productSync.controller");

const productSyncRoutes = express.Router();

productSyncRoutes.get("/sync", orderSyncController)

module.exports = productSyncRoutes;