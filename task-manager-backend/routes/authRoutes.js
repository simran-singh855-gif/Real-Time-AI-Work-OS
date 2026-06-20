const express = require('express');
const router = express.Router();
const { register,login } = require('../controllers/authController');

// The route that will handle user creation
router.post('/register', register);
router.post('/login', login);

module.exports = router;