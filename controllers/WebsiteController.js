const Website = require('../models/Website');
const Activity = require('../models/Activity');

class WebsiteController {
  /**
   * Display a listing of websites.
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
      
      const result = await Website.findAll(filters);
      const result = await Website.findAll(filters, req.user.id);
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching websites:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Display the specified website.
   */
  async show(req, res) {
    try {
      const { id } = req.params;
      const website = await Website.findById(id);
      
      if (!website) {
        return res.status(404).json({ error: 'Website not found' });
      }
      
      res.json(website);
    } catch (error) {
      console.error('Error fetching website:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Store a newly created website.
   */
  async store(req, res) {
    try {
      const website = await Website.create(req.validatedData);
      
      // Log activity
      await Activity.logActivity(
        'website_created',
        'New website added',
        `Website ${website.domain} was added to the system`,
        website.id
      );
      
      res.status(201).json(website);
    } catch (error) {
      console.error('Error creating website:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update the specified website.
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const website = await Website.findById(id);
      
      if (!website) {
        return res.status(404).json({ error: 'Website not found' });
      }
      
      const updatedWebsite = await website.update(req.validatedData);
      
      // Log activity
      await Activity.logActivity(
        'website_updated',
        'Website updated',
        `Website ${updatedWebsite.domain} was updated`,
        updatedWebsite.id
      );
      
      res.json(updatedWebsite);
    } catch (error) {
      console.error('Error updating website:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Remove the specified website.
   */
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const website = await Website.findById(id);
      
      if (!website) {
        return res.status(404).json({ error: 'Website not found' });
      }
      
      await website.delete();
      
      // Log activity
      await Activity.logActivity(
        'website_deleted',
        'Website deleted',
        `Website ${website.domain} was deleted from the system`,
        null,
        req.user.id
      );
      
      res.json({ message: 'Website deleted successfully' });
    } catch (error) {
      console.error('Error deleting website:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new WebsiteController();