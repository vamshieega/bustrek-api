const express = require('express');
const authController = require('../controllers/authController');
const authGuard = require('../middleware/authGuard');

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protected routes
router.post('/logout', authGuard, authController.logout);
router.get('/profile', authGuard, authController.getProfile);

module.exports = router;
