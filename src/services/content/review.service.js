const mongoose = require('mongoose');
const Review = require('../../model/content/review.model');
const Book = require('../../model/content/book.model');

module.exports = class ReviewService {
    async list(bookId) {
        return Review.find({ book: bookId }).populate('user', 'first_name last_name').sort({ createdAt: -1 });
    }

    // One review per user per book — resubmitting updates their existing
    // review rather than creating a duplicate.
    async upsert(bookId, userId, { rating, comment }) {
        const review = await Review.findOneAndUpdate(
            { book: bookId, user: userId },
            { rating, comment: comment || '' },
            { new: true, upsert: true, runValidators: true }
        );
        await this.recalculateBookRating(bookId);
        return review;
    }

    async recalculateBookRating(bookId) {
        const [agg] = await Review.aggregate([
            { $match: { book: new mongoose.Types.ObjectId(bookId) } },
            { $group: { _id: '$book', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const ratingAvg = agg ? Math.round(agg.avg * 10) / 10 : 0;
        const ratingCount = agg ? agg.count : 0;

        await Book.findByIdAndUpdate(bookId, {
            ratingAvg,
            ratingCount,
            rating: ratingAvg // keep the legacy field in sync for existing frontend code
        });
    }
};
