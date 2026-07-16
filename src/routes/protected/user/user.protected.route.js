const express = require('express');
const router = express.Router();
const userController = require('../../../controller/auth/user/user.controller');

router.get('/profile', userController.userProfile);
router.get('/all', userController.fetchAllUser);
router.put('/update', userController.updateUser);
router.delete('/delete', userController.deleteUser);
router.patch('/status', userController.activeOrInActiveUser);
router.post('/change-password', userController.changePassword);

module.exports = router;