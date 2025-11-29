"use strict";
const express = require("express");
const router = express.Router();
const PrivacyPolicyController = require("../controllers/privacyPolicyController");

router.get("/", PrivacyPolicyController.getActivePolicy);

router.get("/versions", PrivacyPolicyController.getAllVersions);

router.get("/:id", PrivacyPolicyController.getVersionById);

router.post("/", PrivacyPolicyController.createVersion);

router.put("/:id", PrivacyPolicyController.updateVersion);

router.patch("/:id/activate", PrivacyPolicyController.activateVersion);

router.delete("/:id", PrivacyPolicyController.deleteVersion);

module.exports = router;
