"use strict";
const express = require("express");
const router = express.Router();
const TermsAndConditionsController = require("../controllers/termsAndConditionsController");

router.get("/", TermsAndConditionsController.getActiveTerms);

router.get("/versions", TermsAndConditionsController.getAllVersions);

router.get("/:id", TermsAndConditionsController.getVersionById);

router.post("/", TermsAndConditionsController.createVersion);

router.put("/:id", TermsAndConditionsController.updateVersion);

router.patch("/:id/activate", TermsAndConditionsController.activateVersion);

router.delete("/:id", TermsAndConditionsController.deleteVersion);

module.exports = router;
