const statusCode = require('http-status-codes');
const QuizResultService = require('../../services/content/quizResult.service');
const { errorResponse, successResponse } = require('../../utils/response');
const { MSG } = require('../../utils/msg');

const quizResultService = new QuizResultService();

module.exports = {
    // POST /content/quiz-results — any logged-in user, saves their own attempt.
    save: async (req, res) => {
        try {
            if (!req.user) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, 'Only logged-in users can save quiz results.')
                );
            }
            const { level, score, totalQuestions, correctCount, wrongCount, answers } = req.body;
            if (
                typeof score !== 'number' ||
                typeof totalQuestions !== 'number' ||
                typeof correctCount !== 'number' ||
                typeof wrongCount !== 'number'
            ) {
                return res.status(statusCode.BAD_REQUEST).json(
                    errorResponse(statusCode.BAD_REQUEST, true, 'score, totalQuestions, correctCount and wrongCount are required numbers.')
                );
            }
            const result = await quizResultService.save(req.user._id, { level, score, totalQuestions, correctCount, wrongCount, answers });
            return res.status(statusCode.CREATED).json(
                successResponse(statusCode.CREATED, false, 'Quiz result saved', result)
            );
        } catch (error) {
            console.log('Save Quiz Result Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    // GET /content/quiz-results/mine — only ever the logged-in user's own
    // results; there is deliberately no way to pass another user's id in.
    mine: async (req, res) => {
        try {
            if (!req.user) {
                return res.status(statusCode.OK).json(
                    successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, [])
                );
            }
            const results = await quizResultService.listForUser(req.user._id);
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, results)
            );
        } catch (error) {
            console.log('List My Quiz Results Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    }
};
