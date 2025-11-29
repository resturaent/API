const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Get routes
router.get("/", paymentController.getAllPayments);
router.get("/daily", paymentController.getDailyPayments);
router.get("/statistics", paymentController.getPaymentStatistics);
router.get("/method/:method", paymentController.getPaymentsByMethod);
router.get(
  "/receipt/:receipt_number",
  paymentController.getPaymentByReceiptNumber
);
router.get("/:id", paymentController.getPaymentById);
router.get("/:id/receipt", paymentController.printReceipt);

// Create/Update routes (add authMiddleware if needed)
router.post("/", paymentController.createPayment);
router.put("/:id", paymentController.updatePayment);
router.delete("/:id", paymentController.deletePayment);

module.exports = router;
