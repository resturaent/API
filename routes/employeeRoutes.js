const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");

// Get routes
router.get("/", employeeController.getAllEmployees);
router.get("/statistics", employeeController.getEmployeeStatistics);
router.get("/role/:role", employeeController.getEmployeesByRole);
router.get("/:id", employeeController.getEmployeeById);
router.get("/:id/performance", employeeController.getEmployeePerformance);

// Admin routes (add authMiddleware and adminMiddleware if needed)
router.post("/", employeeController.createEmployee);
router.put("/:id", employeeController.updateEmployee);
router.delete("/:id", employeeController.deleteEmployee);
router.patch("/:id/activate", employeeController.activateEmployee);
router.patch("/:id/deactivate", employeeController.deactivateEmployee);

module.exports = router;
