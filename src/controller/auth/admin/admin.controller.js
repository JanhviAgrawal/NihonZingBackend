const AdminAuthServices = require("../../../services/admin/admin.service");
const { MSG } = require("../../../utils/msg");
const { errorResponse, successResponse } = require("../../../utils/response");
const { sendRegisterAdminMail, sendOTPMail } = require("../../../utils/mailer");

const moment = require('moment');
const bcrypt = require('bcrypt');
const statusCode = require('http-status-codes');
const jwt = require('jsonwebtoken');

const adminAuthService = new AdminAuthServices();

module.exports.registerAdmin = async (req, res) => {
    try {
        console.log(req.body);

        const Admin = await adminAuthService.fetchSingleAdmin({ email: req.body.email, isDelete: false, isActive: true }, true);

        if (Admin) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_ALREADY_EXISTS));
        }

        const password = req.body.password;

        req.body.password = await bcrypt.hash(req.body.password, 11);

        req.body.created_at = moment().format('DD/MM/YYYY, h:mm:ss A');
        req.body.updated_at = moment().format('DD/MM/YYYY, h:mm:ss A');
        
        // Ensure role is assigned, default to SUB_ADMIN if not provided
        req.body.role = req.body.role || 'SUB_ADMIN';

        req.body.profile_image = req.file ? req.file.path : ''; // Added fallback in case file isn't uploaded

        const newAdmin = await adminAuthService.registerAdmin(req.body);

        if (!newAdmin) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.ADMIN_REGISTRATION_FAILED));
        }

        await sendRegisterAdminMail(req.body.email, password);

        return res.json(successResponse(statusCode.CREATED, false, MSG.ADMIN_REGISTRATION_SUCCESS, newAdmin));

    } catch (error) {
        console.log("Error: ", error);
        return res.json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message));
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
        if (!req.admin) {
            return res.json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
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
        if (!req.admin) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
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