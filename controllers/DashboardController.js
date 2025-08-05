const Website = require('../models/Website');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

class DashboardController {
  constructor() {
    this.getStats = this.getStats.bind(this);
    this.getRecentActivity = this.getRecentActivity.bind(this);
  }

  /**
   * Get dashboard statistics
   */
  async getStats(req, res) {
    try {
      const stats = await Website.getStats();
      
      // Calculate percentage changes (mock data for now)
      const statsWithChanges = {
        totalRevenue: {
          value: `$${stats.totalRevenue.toLocaleString()}`,
          change: '+12.5%',
          label: 'Total Revenue'
        },
        activeWebsites: {
          value: stats.activeWebsites.toString(),
          change: '+2',
          label: 'Active Websites'
        },
        totalLeads: {
          value: stats.totalLeads.toString(),
          change: '+22%',
          label: 'Total Leads'
        },
        activeClients: {
          value: stats.activeClients.toString(),
          change: '+1',
          label: 'Active Clients'
        },
        totalPhones: {
          value: stats.totalPhones.toString(),
          change: '+3',
          label: 'Phone Numbers'
        }
      };

      res.json({
        success: true,
        data: statsWithChanges,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch dashboard statistics',
        message: error.message 
      });
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(req, res) {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'User not authenticated' 
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      
      // Debug logging
      console.log('DashboardController.getRecentActivity called with:', { 
        limit, 
        userId: req.user.id,
        user: req.user 
      });
      
      const activities = await Activity.findRecent(limit, req.user.id);

      const formattedActivities = activities.map(activity => {
        const activityInfo = this.getActivityInfo(activity.type);
        return {
          id: activity.id,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          website: activity.website_domain,
          timestamp: activity.created_at,
          timeAgo: this.getTimeAgo(activity.created_at),
          icon: activityInfo.icon,
          color: activityInfo.color,
          category: activityInfo.category
        };
      });

      res.json({
        success: true,
        data: formattedActivities,
        total: formattedActivities.length
      });
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({ 
        error: 'Failed to fetch recent activity',
        message: error.message 
      });
    }
  }

  /**
   * Helper function to get activity information
   */
  getActivityInfo(type) {
    const activityTypes = {
      // Lead activities
      'lead_created': { icon: '👤', color: 'green', category: 'leads' },
      'lead_updated': { icon: '✏️', color: 'blue', category: 'leads' },
      'lead_deleted': { icon: '🗑️', color: 'red', category: 'leads' },
      
      // Client activities
      'client_created': { icon: '🏢', color: 'green', category: 'clients' },
      'client_updated': { icon: '✏️', color: 'blue', category: 'clients' },
      'client_deleted': { icon: '🗑️', color: 'red', category: 'clients' },
      
      // Website activities
      'website_created': { icon: '🌐', color: 'green', category: 'websites' },
      'website_updated': { icon: '✏️', color: 'blue', category: 'websites' },
      'website_deleted': { icon: '🗑️', color: 'red', category: 'websites' },
      
      // Task activities
      'task_created': { icon: '📝', color: 'green', category: 'tasks' },
      'task_updated': { icon: '✏️', color: 'blue', category: 'tasks' },
      'task_deleted': { icon: '🗑️', color: 'red', category: 'tasks' },
      'task_status_changed': { icon: '🔄', color: 'orange', category: 'tasks' },
      
      // Call log activities
      'call_log_created': { icon: '📞', color: 'green', category: 'calls' },
      'call_log_updated': { icon: '✏️', color: 'blue', category: 'calls' },
      'call_log_deleted': { icon: '🗑️', color: 'red', category: 'calls' },
      
      // Default
      'default': { icon: '📋', color: 'gray', category: 'other' }
    };

    return activityTypes[type] || activityTypes['default'];
  }

  /**
   * Helper function to calculate time ago
   */
  getTimeAgo(date) {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
}

module.exports = new DashboardController();