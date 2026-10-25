const PageContent = require('../../model/content/pageContent.model');

module.exports = class PageContentService {
    async get(pageKey) {
        const doc = await PageContent.findOne({ pageKey });
        // No admin has customized this page yet — hand back an empty shell
        // rather than a 404, so the frontend can fall back to its own
        // built-in defaults on first load.
        return doc || { pageKey, content: {} };
    }

    async upsert(pageKey, content) {
        return PageContent.findOneAndUpdate(
            { pageKey },
            { pageKey, content },
            { new: true, upsert: true, runValidators: true }
        );
    }

    async listKeys() {
        const docs = await PageContent.find({}, 'pageKey updatedAt');
        return docs;
    }
};
