const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");

// Get routes
router.get("/logs", inventoryController.getAllInventoryLogs);
router.get("/logs/:id", inventoryController.getInventoryLogById);
router.get("/logs/product/:product_id", inventoryController.getLogsByProduct);
router.get("/logs/type/:type", inventoryController.getLogsByChangeType);
router.get("/wastage", inventoryController.getRecentWastage);
router.get("/restock", inventoryController.getRestockHistory);
router.get("/statistics", inventoryController.getInventoryStatistics);
router.get("/alerts", inventoryController.getLowStockAlerts);

module.exports = router;
