const Lead = require("../models/Lead");
const Activity = require("../models/Activity");

class LeadController {
  /**
   * Display a listing of leads.
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

      const result = await Lead.findAll(filters, req.user.id);

      res.json(result);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Display the specified lead.
   */
  async show(req, res) {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id, req.user.id);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Store a newly created lead.
   */
  async store(req, res) {
    try {
      // Debug logging
      console.log('LeadController.store called with:', {
        validatedData: req.validatedData,
        headers: req.headers
      });

      // Check if user_id is provided in the request body
      if (!req.validatedData.user_id) {
        return res.status(400).json({ 
          error: 'Missing user_id',
          message: 'user_id is required in the request body' 
        });
      }

      const lead = await Lead.create(req.validatedData);

      // Log activity (use user_id from request body)
      await Activity.logActivity(
        'lead_created',
        'New lead added',
        `Lead "${lead.name || lead.email}" was added to the system`,
        null,
        req.validatedData.user_id
      );

      res.status(201).json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update the specified lead.
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id, req.user.id);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const updatedLead = await lead.update(req.validatedData);

      // Log activity
      await Activity.logActivity(
        'lead_updated',
        'Lead updated',
        `Lead "${updatedLead.name || updatedLead.email}" was updated`,
        null,
        req.user.id
      );

      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Remove the specified lead.
   */
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id, req.user.id);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      await lead.delete();

      // Log activity
      await Activity.logActivity(
        'lead_deleted',
        'Lead deleted',
        `Lead "${lead.name || lead.email}" was deleted from the system`,
        null,
        req.user.id
      );

      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new LeadController();
