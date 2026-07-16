const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
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
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        default: ""
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
        default: true,
    },
    isDelete: {
        type: Boolean,
        default: false,
    },
    created_at: {
        type: String,
        required: true
    },
    updated_at: {
        type: String,
        required: true
    }
});

// indexes for performance
userSchema.index({ isDelete: 1, isActive: 1 });

module.exports = mongoose.model("User", userSchema, "User");