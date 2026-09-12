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
router.post('/add-xp', userController.addXP);
router.post('/change-password', userController.changePassword);

// Admin-only user management (controllers already checked req.admin,
// they just had no routes pointing at them).
router.get('/all', userController.fetchAllUser);
router.delete('/', userController.deleteUser);
router.patch('/toggle-active', userController.activeOrInActiveUser);

module.exports = router;