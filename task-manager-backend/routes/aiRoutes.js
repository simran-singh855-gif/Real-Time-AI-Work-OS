const express = require('express');
const router = express.Router();
const { breakDownTask } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// 🛡️ Protected route for the Magic Breakdown button
router.post('/breakdown', protect, breakDownTask);

module.exports = router;