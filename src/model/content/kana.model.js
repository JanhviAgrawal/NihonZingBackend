const mongoose = require("mongoose");

const PointSchema = new mongoose.Schema({
    x: { type: Number, required: true },
    y: { type: Number, required: true }
}, { _id: false });

const KanaSchema = new mongoose.Schema({
    character: {
        type: String,
        required: true,
        trim: true
    },
    // 'hiragana' or 'katakana' — one collection serves both, same shape
    type: {
        type: String,
        enum: ['hiragana', 'katakana'],
        required: true
    },
    romaji: {
        type: String,
        required: true,
        trim: true
    },
    hindi: {
        type: String,
        default: ''
    },
    // SVG path strokes used to draw/animate the character
    strokes: {
        type: [String],
        default: []
    },
    startPoints: {
        type: [PointSchema],
        default: []
    },
    audioUrl: {
        type: String,
        default: ''
    },
    // Cloudinary public_id, kept so audio can be replaced/deleted cleanly
    audioPublicId: {
        type: String,
        default: ''
    },
    // Controls display order within a type (a-row, ka-row, yoon, etc.)
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDelete: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

KanaSchema.index({ type: 1, character: 1 }, { unique: true });
KanaSchema.index({ isDelete: 1, isActive: 1, type: 1, order: 1 });

module.exports = mongoose.model("Kana", KanaSchema, "Kana");
