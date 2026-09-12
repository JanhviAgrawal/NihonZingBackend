const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        default: ''
    },
    subTitle: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        default: 0
    },
    tags: {
        type: [String],
        default: []
    },
    // `rating` is no longer admin-editable — it's a mirror of `ratingAvg`,
    // kept in sync automatically whenever a Review is created/updated (see
    // services/content/review.service.js) so existing frontend code that
    // reads `book.rating` keeps working without changes.
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    ratingAvg: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    // Cover image (Cloudinary URL). imageColor is kept as a fallback for the
    // neubrutalist placeholder tile style used before real covers existed.
    image: {
        type: String,
        default: ''
    },
    imagePublicId: {
        type: String,
        default: ''
    },
    imageColor: {
        type: String,
        default: 'bg-[#ffc900]'
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

BookSchema.index({ isDelete: 1, isActive: 1, category: 1 });

module.exports = mongoose.model("Book", BookSchema, "Book");
