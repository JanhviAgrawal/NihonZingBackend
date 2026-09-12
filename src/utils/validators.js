const Joi = require('joi');
const { errorResponse } = require('./response');
const statusCode = require('http-status-codes');

const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(statusCode.BAD_REQUEST).json(
                errorResponse(statusCode.BAD_REQUEST, true, error.details[0].message)
            );
        }
        next();
    };
};

module.exports.registerUser = validateRequest(Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow('', null).optional(), 
    gender: Joi.string().valid('male', 'female', 'other').required(),
    password: Joi.string().min(8).required(), 
}));

// The Admin schema has no `gender` field — reusing registerUser's validator
// on the admin register route meant every request without a gender was
// rejected. This one matches what Admin.model.js actually stores.
module.exports.registerAdmin = validateRequest(Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('SUPER_ADMIN', 'SUB_ADMIN').optional(),
}));

module.exports.loginUser = validateRequest(Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
}));

module.exports.forgotPassword = validateRequest(Joi.object({
    email: Joi.string().email().required()
}));

module.exports.verifyOTP = validateRequest(Joi.object({
    email: Joi.string().email().required(),
    OTP: Joi.string().length(6).required()
}));