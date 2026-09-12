const mongoose = require("mongoose");

// Matches QuizPage.tsx's existing QUESTIONS_DB shape exactly:
// { q, options: string[4], correct: number } — one question per document.
const QuizSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    options: {
        type: [String],
        required: true,
        validate: {
            validator: (arr) => Array.isArray(arr) && arr.length === 4 && arr.every((o) => typeof o === 'string' && o.trim().length > 0),
            message: 'A quiz question needs exactly 4 non-empty options.'
        }
    },
    correctAnswerIndex: {
        type: Number,
        required: true,
        min: 0,
        max: 3
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

QuizSchema.index({ isDelete: 1, isActive: 1, order: 1 });

module.exports = mongoose.model("Quiz", QuizSchema, "Quiz");
