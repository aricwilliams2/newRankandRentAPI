const express = require("express");
const router = express.Router();
const CallLogController = require("../controllers/CallLogController");
const { authenticate } = require("../middleware/auth");

// Call log routes
router.post("/call-logs", authenticate, CallLogController.create);
router.put("/call-logs/:id", authenticate, CallLogController.update);
router.delete("/call-logs/:id", authenticate, CallLogController.delete);
router.get("/call-logs/upcoming", authenticate, CallLogController.getUpcomingFollowUps);

module.exports = router; 