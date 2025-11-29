const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Get routes
router.get("/", orderController.getAllOrders);
router.get("/statistics", orderController.getOrderStatistics);
router.get("/status/:status", orderController.getOrdersByStatus);
router.get("/table/:table_id", orderController.getOrdersByTable);
router.get("/:id", orderController.getOrderById);

// Create/Update routes (add authMiddleware if needed)
router.post("/", orderController.createOrder);
router.put("/:id", orderController.updateOrder);
router.patch("/:id/status", orderController.updateOrderStatus);
router.delete("/:id", orderController.deleteOrder);

// Order items management
router.post("/:id/items", orderController.addItemToOrder);
router.delete("/:id/items/:item_id", orderController.removeItemFromOrder);

module.exports = router;
