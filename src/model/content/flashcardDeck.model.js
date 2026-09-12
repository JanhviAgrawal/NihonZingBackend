const mongoose = require("mongoose");

const FlashcardSchema = new mongoose.Schema({
    image: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    frontText: { type: String, required: true },
    backText: { type: String, required: true },
    text3: { type: String, default: '' },
    text4: { type: String, default: '' }
});

const QuizQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswerIndex: { type: Number, required: true }
});

const FlashcardDeckSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    order: {
        type: Number,
        default: 0
    },
    cards: {
        type: [FlashcardSchema],
        default: []
    },
    quiz: {
        type: [QuizQuestionSchema],
        default: []
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

FlashcardDeckSchema.index({ isDelete: 1, isActive: 1, order: 1 });

module.exports = mongoose.model("FlashcardDeck", FlashcardDeckSchema, "FlashcardDeck");
