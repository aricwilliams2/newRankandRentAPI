const CallLog = require("../models/CallLog");
const Lead = require("../models/Lead");
const Activity = require("../models/Activity");

class CallLogController {
  /**
   * Create a new call log
   */
  async create(req, res) {
    try {
      const { lead_id, outcome, notes, next_follow_up, duration } = req.body;

      // Validate required fields
      if (!lead_id || !outcome || !notes) {
        return res.status(400).json({
          success: false,
          message: 'lead_id, outcome, and notes are required'
        });
      }

      // Check if lead exists
      const lead = await Lead.findById(lead_id, req.user.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Create call log (associate with current user)
      const callLog = await CallLog.create({
        user_id: req.user.id,
        lead_id,
        outcome,
        notes,
        next_follow_up,
        duration: duration || 0
      });

      // Log activity
      await Activity.logActivity(
        'call_log_created',
        'Call log added',
        `Call log added for lead "${lead.name || lead.email}"`,
        null,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: callLog
      });
    } catch (error) {
      console.error('Error creating call log:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update a call log
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { outcome, notes, next_follow_up, duration } = req.body;

      const callLog = await CallLog.findById(id);
      if (!callLog) {
        return res.status(404).json({
          success: false,
          message: 'Call log not found'
        });
      }

      // Update call log
      const updatedCallLog = await callLog.update({
        outcome,
        notes,
        next_follow_up,
        duration
      });

      // Log activity
      await Activity.logActivity(
        'call_log_updated',
        'Call log updated',
        `Call log updated for lead ID ${callLog.lead_id}`,
        null,
        req.user.id
      );

      res.json({
        success: true,
        data: updatedCallLog
      });
    } catch (error) {
      console.error('Error updating call log:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete a call log
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const callLog = await CallLog.findById(id);
      if (!callLog) {
        return res.status(404).json({
          success: false,
          message: 'Call log not found'
        });
      }

      await callLog.delete();

      // Log activity
      await Activity.logActivity(
        'call_log_deleted',
        'Call log deleted',
        `Call log deleted for lead ID ${callLog.lead_id}`,
        null,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Call log deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting call log:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get call logs for a specific lead
   */
  async getByLead(req, res) {
    try {
      const { lead_id } = req.params;

      // Check if lead exists and belongs to user
      const lead = await Lead.findById(lead_id, req.user.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const callLogs = await CallLog.findByLeadId(lead_id);

      res.json({
        success: true,
        data: callLogs
      });
    } catch (error) {
      console.error('Error fetching call logs:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get upcoming follow-ups
   */
  async getUpcomingFollowUps(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const followUps = await CallLog.getUpcomingFollowUps(limit);

      res.json({
        success: true,
        data: followUps
      });
    } catch (error) {
      console.error('Error fetching upcoming follow-ups:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new CallLogController(); 