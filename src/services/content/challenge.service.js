const Challenge = require('../../model/content/challenge.model');

// Not built on the generic CRUD factory (crud.factory.js) because that
// factory's isActive-based filtering/toggling doesn't map onto Challenge's
// three-state `status` field (draft/published/completed).
module.exports = class ChallengeService {
    async listPublished() {
        return Challenge.find({ isDelete: false, status: 'published' }).sort({ order: 1, startDate: 1 });
    }

    async listAll() {
        return Challenge.find({ isDelete: false }).sort({ order: 1, createdAt: -1 });
    }

    async getById(id, { adminView = false } = {}) {
        const challenge = await Challenge.findOne({ _id: id, isDelete: false });
        if (!challenge) return null;
        if (!adminView && challenge.status !== 'published') return null;
        return challenge;
    }

    async create(body) {
        return Challenge.create(body);
    }

    async update(id, body) {
        return Challenge.findOneAndUpdate({ _id: id, isDelete: false }, body, { new: true, runValidators: true });
    }

    async setStatus(id, status) {
        return Challenge.findOneAndUpdate({ _id: id, isDelete: false }, { status }, { new: true });
    }

    async softDelete(id) {
        return Challenge.findOneAndUpdate({ _id: id, isDelete: false }, { isDelete: true }, { new: true });
    }
};
