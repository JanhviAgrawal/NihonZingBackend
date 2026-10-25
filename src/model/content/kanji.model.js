const mongoose = require("mongoose");

const PointSchema = new mongoose.Schema({
    x: { type: Number, required: true },
    y: { type: Number, required: true }
}, { _id: false });

const KanjiSchema = new mongoose.Schema({
    character: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    english: {
        type: String,
        required: true,
        trim: true
    },
    hindi: {
        type: String,
        default: ''
    },
    // Optional grouping used by the old data file's comment headers
    // (e.g. "Numbers", "Nature & Elements") — free text, admin-editable
    category: {
        type: String,
        default: ''
    },
    strokes: {
        type: [String],
        default: []
    },
    startPoints: {
        type: [PointSchema],
        default: []
    },
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

KanjiSchema.index({ isDelete: 1, isActive: 1, order: 1 });

module.exports = mongoose.model("Kanji", KanjiSchema, "Kanji");
