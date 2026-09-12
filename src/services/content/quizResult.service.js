const QuizResult = require('../../model/content/quizResult.model');

module.exports = class QuizResultService {
    async save(userId, body) {
        return QuizResult.create({
            user: userId,
            level: body.level,
            score: body.score,
            totalQuestions: body.totalQuestions,
            correctCount: body.correctCount,
            wrongCount: body.wrongCount,
            answers: body.answers || []
        });
    }

    // Scoped to the given user only — callers must always pass the
    // requesting user's own id, never a value taken from the client.
    async listForUser(userId) {
        return QuizResult.find({ user: userId }).sort({ completedAt: -1 });
    }
};
