const ChecklistCompletion = require('../models/ChecklistCompletion');
const Client = require('../models/Client');

class ChecklistController {
  // Get all checklist completion status for a specific client
  static async getClientChecklist(req, res) {
    try {
      const { clientId } = req.params;
      const userId = req.user.id;

      // Verify client belongs to user
      const client = await Client.findById(clientId, userId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get all checklist completion records for this client
      const completions = await ChecklistCompletion.findByUserAndClient(userId, clientId);
      
      // Convert to a map for easy lookup
      const completionMap = {};
      completions.forEach(completion => {
        completionMap[completion.checklist_item_id] = completion;
      });

      res.json({
        success: true,
        data: completionMap
      });
    } catch (error) {
      console.error('Error getting client checklist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Toggle completion status of a checklist item
  static async toggleChecklistItem(req, res) {
    try {
      const { clientId, itemId } = req.params;
      const { isCompleted } = req.body;
      const userId = req.user.id;

      // Verify client belongs to user
      const client = await Client.findById(clientId, userId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Toggle completion status
      const completion = await ChecklistCompletion.toggleCompletion(
        userId, 
        clientId, 
        itemId, 
        isCompleted
      );

      res.json({
        success: true,
        data: completion
      });
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Mark a checklist item as completed
  static async markAsCompleted(req, res) {
    try {
      const { clientId, itemId } = req.params;
      const userId = req.user.id;

      // Verify client belongs to user
      const client = await Client.findById(clientId, userId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Mark as completed
      const completion = await ChecklistCompletion.markAsCompleted(
        userId, 
        clientId, 
        itemId
      );

      res.json({
        success: true,
        data: completion
      });
    } catch (error) {
      console.error('Error marking checklist item as completed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Mark a checklist item as incomplete
  static async markAsIncomplete(req, res) {
    try {
      const { clientId, itemId } = req.params;
      const userId = req.user.id;

      // Verify client belongs to user
      const client = await Client.findById(clientId, userId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Mark as incomplete
      const completion = await ChecklistCompletion.markAsIncomplete(
        userId, 
        clientId, 
        itemId
      );

      res.json({
        success: true,
        data: completion
      });
    } catch (error) {
      console.error('Error marking checklist item as incomplete:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get completion statistics for a client
  static async getCompletionStats(req, res) {
    try {
      const { clientId } = req.params;
      const userId = req.user.id;

      // Verify client belongs to user
      const client = await Client.findById(clientId, userId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get completion statistics
      const stats = await ChecklistCompletion.getCompletionStats(userId, clientId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting completion stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get completed items for a client
  static async getCompletedItems(req, res) {
    try {
      const { clientId } = req.params;
      const userId = req.user.id;

      // Verify client belongs to user
      const client = await Client.findById(clientId, userId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get completed items
      const completedItems = await ChecklistCompletion.getCompletedItems(userId, clientId);

      res.json({
        success: true,
        data: completedItems
      });
    } catch (error) {
      console.error('Error getting completed items:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get incomplete items for a client
  static async getIncompleteItems(req, res) {
    try {
      const { clientId } = req.params;
      const userId = req.user.id;

      // Verify client belongs to user
      const client = await Client.findById(clientId, userId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get incomplete items
      const incompleteItems = await ChecklistCompletion.getIncompleteItems(userId, clientId);

      res.json({
        success: true,
        data: incompleteItems
      });
    } catch (error) {
      console.error('Error getting incomplete items:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Reset all checklist items for a client (mark all as incomplete)
  static async resetClientChecklist(req, res) {
    try {
      const { clientId } = req.params;
      const userId = req.user.id;

      // Verify client belongs to user
      const client = await Client.findById(clientId, userId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Delete all completion records for this client
      await ChecklistCompletion.deleteByUserAndClient(userId, clientId);

      res.json({
        success: true,
        message: 'Checklist reset successfully'
      });
    } catch (error) {
      console.error('Error resetting checklist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = ChecklistController;
