const mongoose = require("mongoose");

const AdminSchema = mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profile_image: {
        type: String,
        required: true
    },
    OTP: {
        type: String,
        default: '',
    },
    OTP_Expire: {
        type: Date,
        default: null
    },
    attempt: {
        type: Number,
        default: 0,
    },
    attempt_expire: {
        type: Date,
        default: null
    },
    verify_attempt: {
        type: Number,
        default: 0,
    },
    verify_attempt_expire: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDelete: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: String,
        required: true
    },
    updated_at: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['SUPER_ADMIN', 'SUB_ADMIN'],
        default: 'SUB_ADMIN'
    },
    permissions: {
        type: [String], 
        default: []
    }
});

// indexes for performance
AdminSchema.index({ email: 1 });
AdminSchema.index({ isDelete: 1, isActive: 1 });

module.exports = mongoose.model("Admin", AdminSchema, "Admin");