const mongoose = require("mongoose");

// One review per user per book — supports the "average rating computed
// from user reviews" requirement, and is extensible later to review counts,
// helpful votes, etc. without a schema rewrite.
const ReviewSchema = new mongoose.Schema({
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' }
}, { timestamps: true });

ReviewSchema.index({ book: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema, "Review");
