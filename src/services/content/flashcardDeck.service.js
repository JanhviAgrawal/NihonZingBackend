const FlashcardDeck = require('../../model/content/flashcardDeck.model');
const { makeCrudService } = require('./crud.factory');

module.exports = class FlashcardDeckService extends makeCrudService(FlashcardDeck) {};
