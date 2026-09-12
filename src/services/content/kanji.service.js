const Kanji = require('../../model/content/kanji.model');
const { makeCrudService } = require('./crud.factory');

module.exports = class KanjiService extends makeCrudService(Kanji) {};
