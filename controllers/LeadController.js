const Lead = require('../models/Lead');

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
        per_page: req.query.per_page
      };
      
      const result = await Lead.findAll(filters);
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Display the specified lead.
   */
  async show(req, res) {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id);
      
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json(lead);
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Store a newly created lead.
   */
  async store(req, res) {
    try {
      const lead = await Lead.create(req.validatedData);
      
      res.status(201).json(lead);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update the specified lead.
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id);
      
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      const updatedLead = await lead.update(req.validatedData);
      
      res.json(updatedLead);
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Remove the specified lead.
   */
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id);
      
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      await lead.delete();
      
      res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new LeadController();