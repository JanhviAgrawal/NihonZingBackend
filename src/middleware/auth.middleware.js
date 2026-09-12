const jwt = require('jsonwebtoken');
const status = require('http-status-codes');

const { errorResponse } = require('../utils/response');
const { MSG } = require('../utils/msg');

const AdminAuthService = require('../services/admin/admin.service');
const UserAuthService = require('../services/user/user.service');

const adminAuthService = new AdminAuthService();
const userAuthService = new UserAuthService();

module.exports.authMiddleware = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (!token || !token.startsWith('Bearer ')) {
            return res.status(status.UNAUTHORIZED).json(errorResponse(status.UNAUTHORIZED, true, MSG.TOKEN_MISSING));
        }

       token = token.slice(7, token.length);

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        let data;

        if (decoded.isAdmin) {

            data = await adminAuthService.fetchSingleAdmin({ _id: decoded.id, isDelete: false, isActive: true }, true);

            if (!data) {
                return res.status(status.UNAUTHORIZED).json(errorResponse(status.UNAUTHORIZED, true, MSG.TOKEN_INVALID));
            }

            req.admin = data;
            req.user = null;
        } else {
         
            data = await userAuthService.fetchSingleUser({ _id: decoded.id, isDelete: false, isActive: true }, true);

            if (!data) {
                return res.status(status.UNAUTHORIZED).json(errorResponse(status.UNAUTHORIZED, true, MSG.TOKEN_INVALID));
            }

            req.user = data;
            req.admin = null;
        }

        next();

    } catch (error) {
        console.log("Auth Middleware Error: ", error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(status.UNAUTHORIZED).json(errorResponse(status.UNAUTHORIZED, true, "Token has expired. Please login again."));
        }
        return res.status(status.UNAUTHORIZED).json(errorResponse(status.UNAUTHORIZED, true, MSG.TOKEN_INVALID));
    }
}