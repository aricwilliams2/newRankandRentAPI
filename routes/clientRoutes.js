const express = require("express");
const router = express.Router();
const ClientController = require("../controllers/ClientController");
const { authenticate } = require("../middleware/auth");
const { validateClient } = require("../middleware/validation");

// Client routes
router.get("/clients", authenticate, ClientController.index);
router.get("/clients/:id", authenticate, ClientController.show);
router.post("/clients", validateClient("store"), ClientController.store);
router.put("/clients/:id", authenticate, validateClient("update"), ClientController.update);
router.delete("/clients/:id", authenticate, ClientController.destroy);

module.exports = router;
