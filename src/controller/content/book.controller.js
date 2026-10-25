const statusCode = require('http-status-codes');
const BookService = require('../../services/content/book.service');
const ReviewService = require('../../services/content/review.service');
const { makeCrudController } = require('./crud.factory');
const { errorResponse, successResponse } = require('../../utils/response');
const { MSG } = require('../../utils/msg');

const bookService = new BookService();
const reviewService = new ReviewService();

const baseController = makeCrudController(bookService, {
    buildListFilter: (req) => {
        const filter = {};
        if (req.query.category && req.query.category !== 'All') {
            filter.category = req.query.category;
        }
        return filter;
    }
});

module.exports = {
    ...baseController,

    // GET /content/books/:id/reviews
    listReviews: async (req, res) => {
        try {
            const reviews = await reviewService.list(req.params.id);
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, reviews)
            );
        } catch (error) {
            console.log('List Reviews Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    // POST /content/books/:id/reviews  { rating, comment } — any logged-in
    // user (not admin-only); one review per user per book, upserted.
    addReview: async (req, res) => {
        try {
            if (!req.user) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS)
                );
            }
            const { rating, comment } = req.body;
            if (!rating || rating < 1 || rating > 5) {
                return res.status(statusCode.BAD_REQUEST).json(
                    errorResponse(statusCode.BAD_REQUEST, true, 'Rating must be between 1 and 5.')
                );
            }
            const review = await reviewService.upsert(req.params.id, req.user._id, { rating, comment });
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, 'Review saved', review)
            );
        } catch (error) {
            console.log('Add Review Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    }
};
