const express = require('express');
const router = express.Router();
const { getUserWorkspaces, createWorkspace } = require('../controllers/workspaceController');
const { protect } = require('../middleware/authMiddleware');

// 🛡️ All workspace routes are protected
router.get('/', protect, getUserWorkspaces);    // Get all my rooms
router.post('/', protect, createWorkspace);     // Make a new room

module.exports = router;