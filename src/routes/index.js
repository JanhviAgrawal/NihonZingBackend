// backend/routes/index.js
const express = require('express');
const { authMiddleware } = require('../middleware/auth.middleware');
const route = express.Router(); 

// Public routes (Login, Register, OTP)
route.use('/auth', require('./auth/auth.route')); 

// Public — landing/intro page content must render for logged-out visitors too.
route.use('/page-content', require('./content/pageContent.public.route'));

// Middleware (Protects everything below this line)
route.use(authMiddleware); 

route.use('/admin', require('./auth/admin/admin.route'));
// Private routes (Profile, Update) - This MUST match the frontend call
route.use('/user', require('./auth/user/user.route')); 

// Content managed from the admin dashboard: kana, kanji, flashcards, books.
// GET is open to any logged-in user/admin, writes require isAdmin (see the
// route file itself).
route.use('/content', require('./content/content.route'));

module.exports = route;