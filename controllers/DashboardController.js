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
      const limit = parseInt(req.query.limit) || 10;
      const activities = await Activity.findRecent(limit);

      const formattedActivities = activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        website: activity.website_domain,
        timestamp: activity.created_at,
        timeAgo: this.getTimeAgo(activity.created_at)
      }));

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