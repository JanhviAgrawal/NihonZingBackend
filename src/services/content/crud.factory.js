/**
 * Generic CRUD service factory.
 *
 * Every content collection (Kana, Kanji, FlashcardDeck, Book) follows the
 * same soft-delete + isActive + order pattern, so instead of copy-pasting
 * the same find/create/update/delete methods four times, each concrete
 * service is just `module.exports = makeCrudService(Model)`.
 */
function makeCrudService(Model, defaultSort = { order: 1, createdAt: 1 }) {
    return class CrudService {
        async list(filter = {}, { includeInactive = false } = {}) {
            const query = { isDelete: false, ...filter };
            if (!includeInactive) {
                query.isActive = true;
            }
            return Model.find(query).sort(defaultSort);
        }

        async listForAdmin(filter = {}) {
            return Model.find({ isDelete: false, ...filter }).sort(defaultSort);
        }

        async getById(id) {
            return Model.findOne({ _id: id, isDelete: false });
        }

        async create(body) {
            return Model.create(body);
        }

        async update(id, body) {
            return Model.findOneAndUpdate(
                { _id: id, isDelete: false },
                body,
                { new: true, runValidators: true }
            );
        }

        async softDelete(id) {
            return Model.findOneAndUpdate(
                { _id: id, isDelete: false },
                { isDelete: true, isActive: false },
                { new: true }
            );
        }

        async toggleActive(id) {
            const doc = await Model.findOne({ _id: id, isDelete: false });
            if (!doc) return null;
            doc.isActive = !doc.isActive;
            await doc.save();
            return doc;
        }
    };
}

module.exports = { makeCrudService };
