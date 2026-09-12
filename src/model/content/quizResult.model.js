const mongoose = require("mongoose");

// One document per completed quiz attempt (one "level" playthrough in
// QuizPage.tsx). Kept intentionally simple — a per-question answer log
// (questionId/selectedIndex) is stored too so a future "review your
// answers" screen doesn't need a schema change.
const QuizAnswerSchema = new mongoose.Schema({
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    selectedIndex: { type: Number },
    isCorrect: { type: Boolean }
}, { _id: false });

const QuizResultSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    level: { type: Number, default: 1 },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    wrongCount: { type: Number, required: true },
    answers: { type: [QuizAnswerSchema], default: [] },
    completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

QuizResultSchema.index({ user: 1, completedAt: -1 });

module.exports = mongoose.model("QuizResult", QuizResultSchema, "QuizResult");
