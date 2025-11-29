const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// Public routes
router.get("/", productController.getAllProducts);
router.get("/available", productController.getAvailableProducts);
router.get("/low-stock", productController.getLowStockProducts);
router.get("/out-of-stock", productController.getOutOfStockProducts);
router.get("/statistics", productController.getProductStatistics);
router.get("/:id", productController.getProductById);

// Admin routes (add authMiddleware and adminMiddleware if needed)
router.post("/", productController.createProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
router.patch("/:id/stock", productController.updateStock);
router.patch("/:id/restock", productController.restockProduct);
router.patch("/:id/availability", productController.setAvailability);

module.exports = router;
