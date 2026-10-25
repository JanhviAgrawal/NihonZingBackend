const Quiz = require('../../model/content/quiz.model');
const { makeCrudService } = require('./crud.factory');

module.exports = class QuizService extends makeCrudService(Quiz) {};
