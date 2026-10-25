const KanjiService = require('../../services/content/kanji.service');
const { makeCrudController } = require('./crud.factory');

const kanjiService = new KanjiService();

module.exports = makeCrudController(kanjiService, {
    buildListFilter: (req) => {
        const filter = {};
        if (req.query.category) {
            filter.category = req.query.category;
        }
        return filter;
    }
});
