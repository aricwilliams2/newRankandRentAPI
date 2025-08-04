const Client = require("../models/Client");
const Activity = require("../models/Activity");

class ClientController {
  /**
   * Display a listing of clients.
   */
  async index(req, res) {
    try {
      const filters = {
        status: req.query.status,
        search: req.query.search,
        sort_by: req.query.sort_by,
        sort_dir: req.query.sort_dir,
        page: req.query.page,
        per_page: req.query.per_page,
      };

      const result = await Client.findAll(filters, req.user.id);

      res.json(result);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Display the specified client.
   */
  async show(req, res) {
    try {
      const { id } = req.params;
      const client = await Client.findById(id, req.user.id);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Store a newly created client.
   */
  async store(req, res) {
    try {
      // Set user_id from authenticated user token
      req.validatedData.user_id = req.body.id;
      console.log("User:", req.user);
      console.log("Validated data:", req.validatedData);
      const client = await Client.create(req.validatedData);

      // Log activity
      await Activity.logActivity(
        'client_created',
        'New client added',
        `Client "${client.name || client.website}" was added to the system`,
        null,
        req.user.id
      );

      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update the specified client.
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      console.log("Updating lead ID:", id);
      console.log("User:", req.user);
      console.log("Validated data:", req.validatedData);
      const client = await Client.findById(id, req.user.id);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const updatedClient = await client.update(req.validatedData);

      // Log activity
      await Activity.logActivity(
        'client_updated',
        'Client updated',
        `Client "${updatedClient.name || updatedClient.website}" was updated`,
        null,
        req.user.id
      );

      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Remove the specified client.
   */
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const client = await Client.findById(id, req.user.id);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      await client.delete();

      // Log activity
      await Activity.logActivity(
        'client_deleted',
        'Client deleted',
        `Client "${client.name || client.website}" was deleted from the system`,
        null,
        req.user.id
      );

      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new ClientController();
