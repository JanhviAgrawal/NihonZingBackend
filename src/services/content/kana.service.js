const Kana = require('../../model/content/kana.model');
const { makeCrudService } = require('./crud.factory');

module.exports = class KanaService extends makeCrudService(Kana) {
    async findOne(type, character) {
        return Kana.findOne({ type, character, isDelete: false });
    }
};
