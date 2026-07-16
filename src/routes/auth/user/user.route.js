const express = require('express');
const router = express.Router();
const validators = require('../../../utils/validators');
const userController = require('../../../controller/auth/user/user.controller');

router.post('/register', validators.registerUser, userController.registerUser);
router.post('/login', validators.loginUser, userController.loginUser);
router.post('/forgot-password', validators.forgotPassword, userController.forgotPassword);
router.post('/verify-otp', validators.verifyOTP, userController.verifyOTP);
router.post('/new-password', userController.newPassword);

router.get('/profile', userController.userProfile);
router.put('/update', userController.updateUser);

module.exports = router;