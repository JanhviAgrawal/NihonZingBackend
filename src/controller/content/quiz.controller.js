const QuizService = require('../../services/content/quiz.service');
const { makeCrudController } = require('./crud.factory');

const quizService = new QuizService();

module.exports = makeCrudController(quizService);
