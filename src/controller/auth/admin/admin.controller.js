const AdminAuthServices = require("../../../services/admin/admin.service");
const Admin = require("../../../model/admin.model");
const { MSG } = require("../../../utils/msg");
const { errorResponse, successResponse } = require("../../../utils/response");
const { sendRegisterAdminMail, sendOTPMail } = require("../../../utils/mailer");

const moment = require('moment');
const bcrypt = require('bcrypt');
const statusCode = require('http-status-codes');
const jwt = require('jsonwebtoken');

const adminAuthService = new AdminAuthServices();

// Shared by both the public bootstrap register route and the protected
// SUPER_ADMIN "create admin" route, so the account-creation logic (hashing,
// defaulting role, sending the welcome email) only lives in one place.
async function createAdminAccount(body, file) {
    const existing = await adminAuthService.fetchSingleAdmin({ email: body.email, isDelete: false, isActive: true }, true);
    if (existing) {
        return { error: MSG.ADMIN_ALREADY_EXISTS };
    }

    const plainPassword = body.password;
    body.password = await bcrypt.hash(body.password, 11);
    body.created_at = moment().format('DD/MM/YYYY, h:mm:ss A');
    body.updated_at = moment().format('DD/MM/YYYY, h:mm:ss A');
    body.role = body.role || 'SUPER_ADMIN';
    body.profile_image = file ? file.path : '';

    const newAdmin = await adminAuthService.registerAdmin(body);
    if (!newAdmin) {
        return { error: MSG.ADMIN_REGISTRATION_FAILED };
    }

    await sendRegisterAdminMail(body.email, plainPassword);
    return { admin: newAdmin };
}

// Public bootstrap route — POST /auth/admin/register. Only usable to create
// the very first admin account; once at least one exists, this is disabled
// and every further admin must be created via the protected, SUPER_ADMIN-only
// POST /admin/create route below instead. Without this restriction anyone
// could hit this endpoint directly (bypassing the dashboard UI entirely) and
// self-register as SUPER_ADMIN.
module.exports.registerAdmin = async (req, res) => {
    try {
        const existingAdminCount = await Admin.countDocuments({ isDelete: false });
        if (existingAdminCount > 0) {
            return res.status(statusCode.FORBIDDEN).json(errorResponse(
                statusCode.FORBIDDEN,
                true,
                'Admin registration is closed. Ask an existing Super Admin to add you from the dashboard.'
            ));
        }

        // The very first admin is always SUPER_ADMIN, regardless of what
        // the request body says — there'd be no one else able to promote them.
        req.body.role = 'SUPER_ADMIN';

        const { error, admin } = await createAdminAccount(req.body, req.file);
        if (error) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, error));
        }

        return res.json(successResponse(statusCode.CREATED, false, MSG.ADMIN_REGISTRATION_SUCCESS, admin));
    } catch (error) {
        console.log("Error: ", error);
        return res.json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

// Protected — POST /admin/create. SUPER_ADMIN only (see isSuperAdmin in the
// route file). This is what the "Add Admin" button in the dashboard now uses.
module.exports.createAdmin = async (req, res) => {
    try {
        if (!req.admin || req.admin.role !== 'SUPER_ADMIN') {
            return res.status(statusCode.FORBIDDEN).json(errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const { error, admin } = await createAdminAccount(req.body, req.file);
        if (error) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, error));
        }

        return res.status(statusCode.CREATED).json(successResponse(statusCode.CREATED, false, MSG.ADMIN_REGISTRATION_SUCCESS, admin));
    } catch (error) {
        console.log("Error: ", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

module.exports.loginAdmin = async (req, res) => {
    try {
        console.log(req.body);
        const admin = await adminAuthService.fetchSingleAdmin({ email: req.body.email, isDelete: false, isActive: true }, false);

        if (!admin) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_NOT_FOUND));
        }

        const isPassword = await bcrypt.compare(req.body.password, admin.password);

        if (!isPassword) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_LOGIN_FAILED));
        }

        // JWT TOKEN 
        const payload = {
            id: admin._id,
            isAdmin: true,
            role: admin.role // Include role in token
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });

        return res.json(successResponse(statusCode.OK, false, MSG.ADMIN_LOGIN_SUCCESS, { token }));

    } catch (error) {
        console.log("Error: ", error);
        return res.json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

module.exports.forgotPassword = async (req, res) => {
    try {
        console.log(req.body);

        const admin = await adminAuthService.fetchSingleAdmin({ email: req.body.email, isDelete: false, isActive: true }, false);

        if (!admin) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_NOT_FOUND));
        }

        if (admin.attempt_expired < Date.now()) {
            admin.attempt = 0;
        }

        if (admin.attempt >= 3) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.MANY_TIME_OTP));
        }

        const OTP = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOTP = await bcrypt.hash(OTP, 10);

        await sendOTPMail(req.body.email, OTP);

        admin.attempt++;

        const expireOTPTime = new Date(Date.now() + 1000 * 60 * 5);

        await adminAuthService.updateAdmin(admin._id, { 
            OTP: hashedOTP, 
            OTP_Expire: expireOTPTime, 
            attempt: admin.attempt,
            attempt_expire: new Date(Date.now() + 1000 * 60 * 60) 
        });

        return res.json(successResponse(statusCode.OK, false, MSG.OTP_SEND));
    } catch (error) {
        console.log("Error: ", error);
        return res.json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

module.exports.verifyOTP = async (req, res) => {
    try {
        const admin = await adminAuthService.fetchSingleAdmin({ email: req.body.email, isDelete: false }, false);

        if (!admin) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_NOT_FOUND));
        }

        if (admin.verify_attempt_expire && admin.verify_attempt_expire < Date.now()) {
            admin.verify_attempt = 0;
        }

        if (admin.verify_attempt >= 3) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.MANY_TIME_OTP));
        }

        if (!admin.OTP_Expire || admin.OTP_Expire < Date.now()) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.OTP_EXPIRED));
        }

        admin.verify_attempt++;

        await adminAuthService.updateAdmin(admin._id, { verify_attempt: admin.verify_attempt, verify_attempt_expire: new Date(Date.now() + 1000 * 60 * 60) });

        const isMatch = await bcrypt.compare(String(req.body.OTP), admin.OTP || '');
        if (!isMatch) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.INVALID_OTP));
        }

        await adminAuthService.updateAdmin(admin._id, { OTP: '', OTP_Expire: null, verify_attempt: admin.verify_attempt, verify_attempt_expire: new Date(Date.now() + 1000 * 60 * 60) });

        // SECURITY PATCH: Generate short-lived token
        const resetToken = jwt.sign({ id: admin._id, reset: true }, process.env.JWT_SECRET_KEY, { expiresIn: "15m" });

        return res.json(successResponse(statusCode.OK, false, MSG.VERIFY_OTP, { resetToken }));

    } catch (error) {
        console.log("Error: ", error);
        return res.json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

module.exports.newPassword = async (req, res) => {
    try {
        // SECURITY PATCH: Check for the token generated during verifyOTP
        if (!req.body.resetToken) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, "Reset token is required."));
        }

        // Verify the token
        const decoded = jwt.verify(req.body.resetToken, process.env.JWT_SECRET_KEY);
        
        if (!decoded.reset) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, "Invalid token type."));
        }

        const admin = await adminAuthService.fetchSingleAdmin({ _id: decoded.id, isDelete: false, isActive: true }, false);

        if (!admin) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_NOT_FOUND));
        }

        const hashedPassword = await bcrypt.hash(req.body.new_password, 11);

        const updatedPassword = await adminAuthService.updateAdmin(admin._id, { password: hashedPassword });

        if (!updatedPassword) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_PASSWORD_UPDATE_FAILED));
        }
        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.ADMIN_PASSWORD_UPDATED));

    } catch (error) {
        console.log("Error: ", error);
        return res.json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, "Invalid or expired reset token."));
    }
}

module.exports.fetchAllAdmin = async (req, res) => {
    try {
        if (!req.admin || req.admin.role !== 'SUPER_ADMIN') {
            return res.status(statusCode.FORBIDDEN).json(errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const allAdmin = await adminAuthService.fetchAllAdmin();

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.ADMIN_FETCH_SUCCESS, allAdmin));
    } catch (error) {
        console.log("Error: ", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

module.exports.deleteAdmin = async (req, res) => {
    try {
        if (!req.admin || req.admin.role !== 'SUPER_ADMIN') {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const admin = await adminAuthService.fetchSingleAdmin({ _id: req.query.id, isDelete: false, isActive: true }, true);

        if (!admin) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_NOT_FOUND));
        }

        const deletedAdmin = await adminAuthService.updateAdmin(req.query.id, { isDelete: true, isActive: false });

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.ADMIN_DELETE_SUCCESS, deletedAdmin));
    } catch (error) {
        console.log("Error : ", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

module.exports.updateAdmin = async (req, res) => {
    try {
        if (!req.admin || req.admin.role !== 'SUPER_ADMIN') {
            return res.status(statusCode.FORBIDDEN).json(errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const admin = await adminAuthService.fetchSingleAdmin({ _id: req.params.id, isDelete: false, isActive: true }, true);

        if (!admin) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_NOT_FOUND));
        }

        const updatedAdmin = await adminAuthService.updateAdmin(req.params.id, req.body);

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.ADMIN_UPDATE_SUCCESS, updatedAdmin));
    } catch (error) {
        console.log("Error : ", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

// Self-service — PUT /admin/profile. Any logged-in admin can update their
// OWN record (name, phone, avatar). Deliberately whitelisted fields only —
// email/role/isActive/password can't be changed through this route, so a
// SUB_ADMIN can't use their own profile form to grant themselves SUPER_ADMIN
// or reactivate a deactivated account. Password changes still go through the
// existing changePassword endpoint below.
module.exports.updateOwnProfile = async (req, res) => {
    try {
        if (!req.admin) {
            return res.status(statusCode.FORBIDDEN).json(errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const allowedUpdates = {};
        if (req.body.first_name !== undefined) allowedUpdates.first_name = req.body.first_name;
        if (req.body.last_name !== undefined) allowedUpdates.last_name = req.body.last_name;
        if (req.body.phone !== undefined) allowedUpdates.phone = req.body.phone;
        if (req.file) allowedUpdates.profile_image = req.file.path;

        const updatedAdmin = await adminAuthService.updateAdmin(req.admin._id, allowedUpdates);

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.ADMIN_UPDATE_SUCCESS, updatedAdmin));
    } catch (error) {
        console.log("Error : ", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

module.exports.activeOrInActiveAdmin = async (req, res) => {
    try {
        if (!req.admin || req.admin.role !== 'SUPER_ADMIN') {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const admin = await adminAuthService.fetchSingleAdmin({ _id: req.query.id, isDelete: false }, true);

        if (!admin) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_NOT_FOUND));
        }

        const updatedAdmin = await adminAuthService.updateAdmin(req.query.id, { isActive: !admin.isActive });

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, `${admin.first_name} ${admin.last_name} is ${updatedAdmin.isActive ? 'active' : 'inactive'}`));
    } catch (error) {
        console.log("Error : ", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}

module.exports.adminProfile = async (req, res) => {
    try {
        if (!req.admin) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }
        
        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.ADMIN_PROFILE_FETCH_SUCCESS, req.admin));
    } catch (err) {
        console.log("Error : ", err);
    }
}

module.exports.changePassword = async (req, res) => {
    try {
        if (!req.admin) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const admin = await adminAuthService.fetchSingleAdmin({ _id: req.admin.id }, false);

        const isPassword = await bcrypt.compare(req.body.current_password, admin.password);

        if (!isPassword) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.CHANGE_PASSWORD_FAILED));
        }

        const hashedPassword = await bcrypt.hash(req.body.new_password, 11);

        await adminAuthService.updateAdmin(req.admin.id, { password: hashedPassword });

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.CHANGE_PASSWORD));
    } catch (error) {
        console.log("Error : ", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
    }
}