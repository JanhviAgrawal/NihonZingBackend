const FlashcardDeckService = require('../../services/content/flashcardDeck.service');
const { makeCrudController } = require('./crud.factory');

const flashcardDeckService = new FlashcardDeckService();

module.exports = makeCrudController(flashcardDeckService);
