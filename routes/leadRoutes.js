const express = require("express");
const router = express.Router();
const LeadController = require("../controllers/LeadController");
const { authenticate } = require("../middleware/auth");
const { validateLead } = require("../middleware/validation");

// Lead routes
router.get("/leads", authenticate, LeadController.index);
router.get("/leads/:id", authenticate, LeadController.show);
router.post("/leads", validateLead("store"), LeadController.store);
router.put("/leads/:id", authenticate, validateLead("update"), LeadController.update);
router.delete("/leads/:id", authenticate, LeadController.destroy);

module.exports = router;
