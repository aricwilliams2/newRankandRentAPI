const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/TaskController');
const { authenticate } = require('../middleware/auth');
const { validateTask } = require('../middleware/validation');

// Task routes
router.get('/tasks', authenticate, TaskController.index);
router.get('/tasks/:id', authenticate, TaskController.show);
router.post('/tasks', authenticate, validateTask('store'), TaskController.store);
router.put('/tasks/:id', authenticate, validateTask('update'), TaskController.update);
router.delete('/tasks/:id', authenticate, TaskController.destroy);

module.exports = router;