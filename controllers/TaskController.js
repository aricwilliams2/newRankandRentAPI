const Task = require('../models/Task');
const Activity = require('../models/Activity');

class TaskController {
  /**
   * Display a listing of tasks.
   */
  async index(req, res) {
    try {
      const filters = {
        status: req.query.status,
        website_id: req.query.website_id,
        priority: req.query.priority,
        assignee: req.query.assignee,
        search: req.query.search,
        sort_by: req.query.sort_by,
        sort_dir: req.query.sort_dir,
        page: req.query.page,
        per_page: req.query.per_page
      };
      
      const result = await Task.findAll(filters);
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Display the specified task.
   */
  async show(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Store a newly created task.
   */
  async store(req, res) {
    try {
      // Set user_id from authenticated user token
      req.validatedData.user_id = req.user.id;
      const task = await Task.create(req.validatedData);
      
      // Log activity
      await Activity.logActivity(
        'task_created',
        'New task created',
        `Task "${task.title}" was created`,
        task.website_id,
        req.user.id
      );
      
      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update the specified task.
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const oldStatus = task.status;
      const updatedTask = await task.update(req.validatedData);
      
      // Log activity for status changes
      if (oldStatus !== updatedTask.status) {
        await Activity.logActivity(
          'task_status_changed',
          'Task status updated',
          `Task "${updatedTask.title}" status changed from ${oldStatus} to ${updatedTask.status}`,
          updatedTask.website_id,
          req.user.id
        );
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Remove the specified task.
   */
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      await task.delete();
      
      // Log activity
      await Activity.logActivity(
        'task_deleted',
        'Task deleted',
        `Task "${task.title}" was deleted`,
        task.website_id,
        req.user.id
      );
      
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new TaskController();