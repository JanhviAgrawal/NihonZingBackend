const UserAuthService = require("../../../services/user/user.service");
const moment = require('moment');
const bcrypt = require('bcrypt');
const statusCode = require('http-status-codes');
const jwt = require('jsonwebtoken');
const { sendOTPMail } = require("../../../utils/mailer");
const { MSG } = require("../../../utils/msg");
const { errorResponse, successResponse } = require("../../../utils/response");

const userAuthService = new UserAuthService();

module.exports.registerUser = async (req, res) => {
    try {
        console.log(req.body);

        // ensure email not already used (regardless of active status)
        const existing = await userAuthService.fetchSingleUser({ email: req.body.email, isDelete: false }, true);
        if (existing) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_ALREADY_EXISTS));
        }

        req.body.password = await bcrypt.hash(req.body.password, 11);
        req.body.created_at = moment().format('DD/MM/YYYY, h:mm:ss A');
        req.body.updated_at = moment().format('DD/MM/YYYY, h:mm:ss A');

        // create as inactive until OTP verification
        req.body.isActive = false;

        const newUser = await userAuthService.registerUser(req.body);

        if (!newUser) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_REGISTER_FAILED));
        }

        // Generate OTP, hash it and store
        const OTP = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOTP = await bcrypt.hash(OTP, 10);
        await sendOTPMail(req.body.email, OTP);

        const expireOTPTime = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes
        await userAuthService.updateUser(newUser._id, { OTP: hashedOTP, OTP_Expire: expireOTPTime, attempt: 0, attempt_expire: null });

        return res.status(statusCode.CREATED).json(successResponse(statusCode.CREATED, false, MSG.USER_REGISTER_SUCCESS));

    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}

module.exports.loginUser = async (req, res) => {
    try {
        console.log(req.body);

        const user = await userAuthService.fetchSingleUser({ email: req.body.email, isDelete: false, isActive: true }, false);

        if (!user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_NOT_FOUND));
        }

        const isPassword = await bcrypt.compare(req.body.password, user.password);

        if (!isPassword) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_LOGIN_FAILED));
        }

        // JWT Token
        const payload = {
            id: user._id,
            isAdmin: false
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "1h" });

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.USER_LOGIN_SUCCESS, { token }));

    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}

module.exports.forgotPassword = async (req, res) => {
    try {
        console.log(req.body);
        // fetch user regardless of active status (support resend for signup and forgot flows)
        const user = await userAuthService.fetchSingleUser({ email: req.body.email, isDelete: false }, false);

        if (!user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_NOT_FOUND));
        }

        if (user.attempt_expire && user.attempt_expire < Date.now()) {
            user.attempt = 0;
        }

        if (user.attempt >= 3) {
            return res.status(statusCode.TOO_MANY_REQUESTS).json(
                errorResponse(statusCode.TOO_MANY_REQUESTS, true, MSG.MANY_TIME_OTP)
            );
        }

        const OTP = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOTP = await bcrypt.hash(OTP, 10);

        await sendOTPMail(req.body.email, OTP);

        user.attempt++;

        const expireOTPTime = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes

        await userAuthService.updateUser(user._id, { OTP: hashedOTP, OTP_Expire: expireOTPTime, attempt: user.attempt, attempt_expire: new Date(Date.now() + 1000 * 60 * 60) });

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.OTP_SEND));

    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}

module.exports.verifyOTP = async (req, res) => {
    try {
        console.log(req.body);

        // fetch user regardless of active state so signup verification works
        const user = await userAuthService.fetchSingleUser({ email: req.body.email, isDelete: false }, false);

        if (!user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_NOT_FOUND));
        }

        if (user.verify_attempt_expire && user.verify_attempt_expire < Date.now()) {
            user.verify_attempt = 0;
        }

        if (user.verify_attempt >= 3) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.MANY_TIME_OTP));
        }

        if (!user.OTP_Expire || user.OTP_Expire < Date.now()) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.OTP_EXPIRED));
        }

        user.verify_attempt++;

        await userAuthService.updateUser(user._id, { verify_attempt: user.verify_attempt, verify_attempt_expire: new Date(Date.now() + 1000 * 60 * 60) });

        // compare hashed OTP
        const isMatch = await bcrypt.compare(String(req.body.OTP), user.OTP || '');
        if (!isMatch) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.INVALID_OTP));
        }

        // mark verified and clear OTP
        await userAuthService.updateUser(user._id, { OTP: '', OTP_Expire: null, isActive: true, verify_attempt: user.verify_attempt, verify_attempt_expire: new Date(Date.now() + 1000 * 60 * 60) });

        // SECURITY PATCH: Generate a short-lived token to authorize the password reset
        const resetToken = jwt.sign({ id: user._id, reset: true }, process.env.JWT_SECRET_KEY, { expiresIn: "15m" });

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.VERIFY_OTP, { resetToken }));

    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}

module.exports.newPassword = async (req, res) => {
    try {
        console.log(req.body);

        // SECURITY PATCH: Check for the token generated during verifyOTP
        if (!req.body.resetToken) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, "Reset token is required."));
        }

        // Verify the token
        const decoded = jwt.verify(req.body.resetToken, process.env.JWT_SECRET_KEY);

        if (!decoded.reset) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, "Invalid token type."));
        }

        const user = await userAuthService.fetchSingleUser({ _id: decoded.id, isDelete: false, isActive: true }, true);

        if (!user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_NOT_FOUND));
        }

        const hashedPassword = await bcrypt.hash(req.body.new_password, 11);

        const updatedPassword = await userAuthService.updateUser(user._id, { password: hashedPassword });

        if (!updatedPassword) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_PASSWORD_UPDATE_FAILED));
        }

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.USER_PASSWORD_UPDATED));

    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, "Invalid or expired reset token."));
    }
}

module.exports.fetchAllUser = async (req, res) => {
    try {
        // Only allow admins to fetch all users (assuming req.admin is set by authMiddleware for admins)
        if (!req.admin) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const allUsers = await userAuthService.fetchAllUser();

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.USER_FETCH_SUCCESS, allUsers));
    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}

module.exports.deleteUser = async (req, res) => {
    try {
        if (!req.admin) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const user = await userAuthService.fetchSingleUser({ _id: req.query.id, isDelete: false, isActive: true }, true);

        if (!user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_NOT_FOUND));
        }

        const deletedUser = await userAuthService.updateUser(req.query.id, { isDelete: true, isActive: false });

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.USER_DELETE_SUCCESS, deletedUser));
    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}

module.exports.updateUser = async (req, res) => {
    try {
        // Use req.user._id (from token) instead of req.query.id
        const userId = req.user ? req.user._id : req.query.id;

        if (!userId) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const user = await userAuthService.fetchSingleUser({ _id: userId, isDelete: false, isActive: true }, true);

        if (!user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_NOT_FOUND));
        }

        const updatedUser = await userAuthService.updateUser(userId, req.body);

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.USER_UPDATE_SUCCESS, updatedUser));
    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}

module.exports.activeOrInActiveUser = async (req, res) => {
    try {
        if (!req.admin) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const user = await userAuthService.fetchSingleUser({ _id: req.query.id, isDelete: false }, true);

        if (!user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_NOT_FOUND));
        }

        const updatedUser = await userAuthService.updateUser(req.query.id, { isActive: !user.isActive });

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, `${user.first_name} ${user.last_name} is ${updatedUser.isActive ? 'active' : 'inactive'}`));
    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}

module.exports.userProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }
        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.USER_PROFILE_FETCH_SUCCESS, req.user));
    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}

module.exports.changePassword = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const user = await userAuthService.fetchSingleUser({ _id: req.user._id }, false);

        const isPassword = await bcrypt.compare(req.body.current_password, user.password);

        if (!isPassword) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.CHANGE_PASSWORD_FAILED));
        }

        const hashedPassword = await bcrypt.hash(req.body.new_password, 11);

        await userAuthService.updateUser(req.user._id, { password: hashedPassword });

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.CHANGE_PASSWORD));
    } catch (err) {
        console.log("Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, err.message));
    }
}