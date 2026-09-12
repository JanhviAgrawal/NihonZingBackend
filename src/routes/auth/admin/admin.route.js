const express = require('express');
const router = express.Router();
const multer = require('multer');

const validators = require('../../../utils/validators');
const adminController = require('../../../controller/auth/admin/admin.controller');
const { imageStorage } = require('../../../middleware/storage.middleware');
const { isSuperAdmin } = require('../../../middleware/checkRole');

const uploadImage = multer({ storage: imageStorage });

// Public bootstrap route — only works while zero admins exist (see
// controller). After the first admin is created, this always 403s and
// POST /admin/create (below, SUPER_ADMIN only) is the only way to add more.
router.post('/register', uploadImage.single('profile_image'), validators.registerAdmin, adminController.registerAdmin);
router.post('/login', validators.loginUser, adminController.loginAdmin);
router.post('/forgot-password', validators.forgotPassword, adminController.forgotPassword);
router.post('/verify-otp', validators.verifyOTP, adminController.verifyOTP);
router.post('/new-password', adminController.newPassword);
router.get('/profile', adminController.adminProfile);
router.post('/change-password', adminController.changePassword);

// Admin-management (SUPER_ADMIN manages SUB_ADMIN accounts).
router.get('/all', isSuperAdmin, adminController.fetchAllAdmin);
router.post('/create', isSuperAdmin, uploadImage.single('profile_image'), validators.registerAdmin, adminController.createAdmin);

// Self-service — any logged-in admin can update their own profile. This
// MUST be registered before PUT /:id, or Express will match /:id first and
// treat "profile" as an admin's _id (routing it through the SUPER_ADMIN-only
// updateAdmin handler instead of updateOwnProfile).
router.put('/profile', uploadImage.single('profile_image'), adminController.updateOwnProfile);

router.put('/:id', isSuperAdmin, adminController.updateAdmin);
router.delete('/', isSuperAdmin, adminController.deleteAdmin);
router.patch('/toggle-active', isSuperAdmin, adminController.activeOrInActiveAdmin);

module.exports = router;
