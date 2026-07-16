const express = require('express');
const router = express.Router();

const validators = require('../../../utils/validators');
const adminController = require('../../../controller/auth/admin/admin.controller');

router.post('/register', validators.registerUser, adminController.registerAdmin);
router.post('/login', validators.loginUser, adminController.loginAdmin);
router.post('/forgot-password', validators.forgotPassword, adminController.forgotPassword);
router.post('/verify-otp', validators.verifyOTP, adminController.verifyOTP);
router.post('/new-password', adminController.newPassword);
router.get('/profile', adminController.adminProfile);

module.exports = router;

