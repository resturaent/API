const express = require("express");
const router = express.Router();
const tableController = require("../controllers/tableController");

// Public routes
router.get("/", tableController.getAllTables);
router.get("/available", tableController.getAvailableTables);
router.get("/statistics", tableController.getTableStatistics);
router.get("/:id", tableController.getTableById);

// Admin/Staff routes (add authMiddleware if needed)
router.post("/", tableController.createTable);
router.put("/:id", tableController.updateTable);
router.delete("/:id", tableController.deleteTable);
router.patch("/:id/status", tableController.updateTableStatus);
router.patch("/:id/occupy", tableController.occupyTable);
router.patch("/:id/free", tableController.freeTable);

module.exports = router;
