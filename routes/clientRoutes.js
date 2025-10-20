const express = require("express");
const router = express.Router();
const ClientController = require("../controllers/ClientController");
const WebsiteController = require("../controllers/WebsiteController");
const { authenticate } = require("../middleware/auth");
const { validateClient } = require("../middleware/validation");

// Client routes
router.get("/clients", authenticate, ClientController.index);
router.get("/clients/:id", authenticate, ClientController.show);
router.post("/clients", authenticate, validateClient("store"), ClientController.store);
router.put("/clients/:id", authenticate, validateClient("update"), ClientController.update);
router.delete("/clients/:id", authenticate, ClientController.destroy);

// Website routes (same format as clients)
router.get("/clients/websites", authenticate, WebsiteController.index);
router.get("/clients/websites/:id", authenticate, WebsiteController.show);
router.post("/clients/websites", authenticate, WebsiteController.store);
router.put("/clients/websites/:id", authenticate, WebsiteController.update);
router.delete("/clients/websites/:id", authenticate, WebsiteController.destroy);

module.exports = router;
