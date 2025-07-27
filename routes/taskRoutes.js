const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/TaskController');
const { validateTask } = require('../middleware/validation');

// Task routes
router.get('/tasks', TaskController.index);
router.get('/tasks/:id', TaskController.show);
router.post('/tasks', validateTask('store'), TaskController.store);
router.put('/tasks/:id', validateTask('update'), TaskController.update);
router.delete('/tasks/:id', TaskController.destroy);

module.exports = router;