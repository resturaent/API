const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

// Public routes
router.get("/", categoryController.getAllCategories);
router.get("/active", categoryController.getActiveCategories);
router.get("/type/:type", categoryController.getCategoriesByType);
router.get("/statistics", categoryController.getCategoryStatistics);
router.get("/:id", categoryController.getCategoryById);

// Admin routes (add authMiddleware and adminMiddleware if needed)
router.post("/", categoryController.createCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);
router.patch("/:id/activate", categoryController.activateCategory);
router.patch("/:id/deactivate", categoryController.deactivateCategory);

module.exports = router;
