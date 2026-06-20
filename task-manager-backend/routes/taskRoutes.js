const express = require('express');
const router = express.Router();
const { createTask, getTasks, updateTask, deleteTask, getTaskStats } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// 🛡️ THE SECURE ROUTES
// Every route is protected by your JWT middleware.

// 1. Specific Static Routes (Must go first!)
router.get('/stats', protect, getTaskStats);  // Read Analytics

// 2. Standard CRUD Routes
router.post('/', protect, createTask);        // Create Task
router.get('/', protect, getTasks);           // Read All Tasks

// 3. Dynamic Parameterized Routes (Must go last!)
router.put('/:id', protect, updateTask);      // Update Task
router.delete('/:id', protect, deleteTask);   // Delete Task

module.exports = router;