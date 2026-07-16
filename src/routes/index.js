// backend/routes/index.js
const express = require('express');
const { authMiddleware } = require('../middleware/auth.middleware');
const route = express.Router(); 

// Public routes (Login, Register, OTP)
route.use('/auth', require('./auth/auth.route')); 

// Middleware (Protects everything below this line)
route.use(authMiddleware); 

route.use('/admin', require('./auth/admin/admin.route'));
// Private routes (Profile, Update) - This MUST match the frontend call
route.use('/user', require('./auth/user/user.route')); 

module.exports = route;